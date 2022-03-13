/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable import/no-extraneous-dependencies */
import * as logs from '@aws-cdk/aws-logs';
import * as cdk from '@aws-cdk/core';
import * as fs from 'fs';
import path from 'path';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as ssm from '@aws-cdk/aws-ssm';
import * as sns from '@aws-cdk/aws-sns';
import * as cw from '@aws-cdk/aws-cloudwatch';
import * as cwActions from '@aws-cdk/aws-cloudwatch-actions';
import StateMachineWithGraph from '@andybalham/state-machine-with-graph';
import StateMachineBuilder from '@andybalham/state-machine-builder';
import { CREDIT_REFERENCE_URL_PARAMETER_NAME_ENV_VAR } from './LoanProcessor.CreditReferenceProxyFunction';
import { IDENTITY_CHECK_URL_PARAMETER_NAME_ENV_VAR } from './LoanProcessor.IdentityCheckProxyFunction';

export interface LoanProcessorProps {
  creditReferenceUrlParameterName: string;
  identityCheckUrlParameterName: string;
  alarmTopic: sns.ITopic;
}

export default class LoanProcessor extends cdk.Construct {
  //
  readonly stateMachine: StateMachineWithGraph;

  constructor(scope: cdk.Construct, id: string, props: LoanProcessorProps) {
    super(scope, id);

    this.stateMachine = new StateMachineWithGraph(this, 'LoanProcessorStateMachine', {
      stateMachineType: sfn.StateMachineType.EXPRESS,
      logs: {
        destination: new logs.LogGroup(this, 'LoanProcessorStateMachineLogGroup'),
        level: sfn.LogLevel.ALL,
        includeExecutionData: false,
      },
      replaceCdkTokens: true,
      getDefinition: (definitionScope): sfn.IChainable => {
        //
        const creditReferenceProxyFunction = LoanProcessor.newCreditReferenceFunction(
          definitionScope,
          props
        );

        const identityCheckProxyFunction = LoanProcessor.newIdentityCheckFunction(
          definitionScope,
          props
        );

        const errorHandlerFunction = new lambdaNodejs.NodejsFunction(
          definitionScope,
          'ErrorHandlerFunction'
        );

        const definition = new StateMachineBuilder()
          //
          .lambdaInvoke('IdentityCheckGateway', {
            lambdaFunction: identityCheckProxyFunction,
            parameters: {
              'correlationId.$': '$$.Execution.Input.correlationId',
              'firstName.$': '$$.Execution.Input.firstName',
              'lastName.$': '$$.Execution.Input.lastName',
              'postcode.$': '$$.Execution.Input.postcode',
            },
            resultPath: '$.identityCheck',
            retry: {
              maxAttempts: 0,
            },
            catches: [{ handler: 'HandleIdentityCheckFailure' }],
          })

          .lambdaInvoke('CreditReferenceGateway', {
            lambdaFunction: creditReferenceProxyFunction,
            parameters: {
              'correlationId.$': '$$.Execution.Input.correlationId',
              'firstName.$': '$$.Execution.Input.firstName',
              'lastName.$': '$$.Execution.Input.lastName',
              'postcode.$': '$$.Execution.Input.postcode',
            },
            resultPath: '$.creditReference',
            retry: {
              maxAttempts: 0,
            },
            catches: [{ handler: 'HandleCreditReferenceFailure' }],
          })

          .lambdaInvoke('PersistResults', {
            lambdaFunction: new lambdaNodejs.NodejsFunction(
              definitionScope,
              'PersistResultsFunction'
            ),
            parameters: {
              'executionInput.$': '$$.Execution.Input',
              'identityCheck.$': '$.identityCheck',
              'creditReference.$': '$.creditReference',
            },
          })
          .end()

          .lambdaInvoke('HandleIdentityCheckFailure', {
            lambdaFunction: errorHandlerFunction,
            parameters: {
              failedStateName: 'IdentityCheckGateway',
              'stateMachineName.$': '$$.StateMachine.Name',
              'correlationId.$': '$$.Execution.Input.correlationId',
              'cause.$': 'States.StringToJson($.Cause)',
            },
          })
          .fail('IdentityCheckFail', { cause: 'Identity check gateway failure' })

          .lambdaInvoke('HandleCreditReferenceFailure', {
            lambdaFunction: errorHandlerFunction,
            parameters: {
              failedStateName: 'CreditReferenceGateway',
              'stateMachineName.$': '$$.StateMachine.Name',
              'correlationId.$': '$$.Execution.Input.correlationId',
              'cause.$': 'States.StringToJson($.Cause)',
            },
          })
          .fail('CreditReferenceFail', { cause: 'Credit reference gateway failure' })

          .build(definitionScope, {
            defaultProps: {
              lambdaInvoke: {
                payloadResponseOnly: true,
                retryOnServiceExceptions: false,
              },
            },
          });

        return definition;
      },
    });

    writeGraphJson(this.stateMachine);

    const loanProcessorErrorCount = new cw.Metric({
      namespace: 'EmbeddedMetricsExample',
      metricName: 'ErrorCount',
      dimensionsMap: {
        ProcessName: 'LoanProcessor',
        // ServiceType: 'AWS::Lambda::Function',
        // ServiceName: errorHandlerFunction.functionName,
        // LogGroup: errorHandlerFunction.functionName, // This works
        // LogGroup: errorHandlerFunction.logGroup.logGroupName, // I would have expected this to work
        // LogGroup: errorHandlerFunction.logGroup.logGroupName.slice( // Does this work? No
        //   errorHandlerFunction.logGroup.logGroupName.lastIndexOf('/')
        // ),
      },
    }).with({
      statistic: 'sum',
      period: cdk.Duration.minutes(5),
    });

    const loanProcessorErrorCountAlarm = loanProcessorErrorCount.createAlarm(
      this,
      'LoanProcessorErrorCountAlarm',
      {
        evaluationPeriods: 1,
        comparisonOperator: cw.ComparisonOperator.GREATER_THAN_THRESHOLD,
        threshold: 0,
        treatMissingData: cw.TreatMissingData.NOT_BREACHING,
      }
    );

    loanProcessorErrorCountAlarm.addAlarmAction(new cwActions.SnsAction(props.alarmTopic));
  }

  private static newCreditReferenceFunction(
    scope: cdk.Construct,
    props: LoanProcessorProps
  ): lambda.IFunction {
    const creditReferenceApiUrlParameter = ssm.StringParameter.fromStringParameterName(
      scope,
      'CreditReferenceApiUrlParameter',
      props.creditReferenceUrlParameterName
    );

    const creditReferenceProxyFunction = new lambdaNodejs.NodejsFunction(
      scope,
      'CreditReferenceProxyFunction',
      {
        environment: {
          [CREDIT_REFERENCE_URL_PARAMETER_NAME_ENV_VAR]: props.creditReferenceUrlParameterName,
        },
      }
    );

    creditReferenceApiUrlParameter.grantRead(creditReferenceProxyFunction);

    return creditReferenceProxyFunction;
  }

  private static newIdentityCheckFunction(
    scope: cdk.Construct,
    props: LoanProcessorProps
  ): lambda.IFunction {
    const identityCheckApiUrlParameter = ssm.StringParameter.fromStringParameterName(
      scope,
      'IdentityCheckApiUrlParameter',
      props.identityCheckUrlParameterName
    );

    const identityCheckProxyFunction = new lambdaNodejs.NodejsFunction(
      scope,
      'IdentityCheckProxyFunction',
      {
        environment: {
          [IDENTITY_CHECK_URL_PARAMETER_NAME_ENV_VAR]: props.identityCheckUrlParameterName,
        },
      }
    );

    identityCheckApiUrlParameter.grantRead(identityCheckProxyFunction);

    return identityCheckProxyFunction;
  }
}

function writeGraphJson(stateMachine: StateMachineWithGraph): void {
  //
  const stateMachinePath = path.join(__dirname, 'stateMachines');

  if (!fs.existsSync(stateMachinePath)) fs.mkdirSync(stateMachinePath);

  fs.writeFileSync(
    path.join(stateMachinePath, `${stateMachine.node.id}-Generated.asl.json`),
    stateMachine.graphJson
  );
}
