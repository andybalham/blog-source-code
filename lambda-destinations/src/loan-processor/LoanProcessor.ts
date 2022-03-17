/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
/*
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as ssm from '@aws-cdk/aws-ssm';
import * as cw from '@aws-cdk/aws-cloudwatch';
import * as cwActions from '@aws-cdk/aws-cloudwatch-actions';
import { CREDIT_REFERENCE_URL_PARAMETER_NAME_ENV_VAR } from './LoanProcessor.CreditReferenceProxyFunction';
import { IDENTITY_CHECK_URL_PARAMETER_NAME_ENV_VAR } from './LoanProcessor.IdentityCheckProxyFunction';
*/

export interface LoanProcessorProps {
  creditReferenceUrlParameterName: string;
  identityCheckUrlParameterName: string;
  alarmTopic: sns.ITopic;
}

export default class LoanProcessor extends cdk.Construct {
  //
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(scope: cdk.Construct, id: string, props: LoanProcessorProps) {
    super(scope, id);

    /*
    const loanProcessorErrorCount = new cw.Metric({
      namespace: 'EmbeddedMetricsExample',
      metricName: 'ErrorCount',
      dimensionsMap: {
        ProcessName: 'LoanProcessor',
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
*/
  }
}
