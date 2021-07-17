/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as sns from '@aws-cdk/aws-sns';
import * as sfnTasks from '@aws-cdk/aws-stepfunctions-tasks';
import * as lambda from '@aws-cdk/aws-lambda';
import StateMachineBuilder from '@andybalham/state-machine-builder';
import StateMachineWithGraph from '@andybalham/state-machine-with-graph';
import { FileType } from '../../contracts';

export interface ResultCalculatorStateMachineProps
  extends Omit<sfn.StateMachineProps, 'definition'> {
  fileHeaderReaderFunction: lambda.IFunction;
  fileHeaderIndexReaderFunction: lambda.IFunction;
  combineHeadersFunction: lambda.IFunction;
  calculateResultFunction: lambda.IFunction;
  errorTopic: sns.ITopic;
}

const retryProps: sfn.RetryProps = {
  errors: [sfn.Errors.ALL],
  maxAttempts: 3,
  interval: cdk.Duration.seconds(2),
};

export default class ResultCalculatorStateMachine extends StateMachineWithGraph {
  //
  constructor(scope: cdk.Construct, id: string, props: ResultCalculatorStateMachineProps) {
    super(scope, id, {
      ...props,
      getDefinition: (definitionScope: cdk.Construct): sfn.IChainable =>
        StateMachineBuilder.new()

          .lambdaInvoke('FileReader', {
            lambdaFunction: props.fileHeaderReaderFunction,
            catches: [{ handler: 'PublishFileReadError' }],
            // https://medium.com/system-design/building-aws-step-function-lambda-with-cdk-and-handling-error-case-e405b6a33aa6
            retry: retryProps,
            parameters: {
              s3Key: '$.fileEvent.s3Key',
            },
            resultPath: '$.fileHeader',
          })

          .choice('FileType', {
            choices: [
              {
                when: sfn.Condition.stringEquals('$.fileHeader.fileType', FileType.Configuration),
                next: 'ReadScenarioHeaders',
              },
              {
                when: sfn.Condition.stringEquals('$.fileHeader.fileType', FileType.Scenario),
                next: 'ReadConfigurationHeaders',
              },
            ],
            otherwise: 'PublishUnhandledFileTypeError',
          })

          .lambdaInvoke('ReadConfigurationHeaders', {
            lambdaFunction: props.fileHeaderIndexReaderFunction,
            parameters: {
              criteriaType: 'FileType',
              fileType: FileType.Configuration,
            },
            resultPath: '$.configurations',
          })
          .next('CombineHeaders')

          .lambdaInvoke('ReadScenarioHeaders', {
            lambdaFunction: props.fileHeaderIndexReaderFunction,
            parameters: {
              criteriaType: 'FileType',
              fileType: FileType.Scenario,
            },
            resultPath: '$.scenarios',
          })
          .next('CombineHeaders')

          .lambdaInvoke('CombineHeaders', {
            lambdaFunction: props.combineHeadersFunction,
            resultPath: '$.combinations',
          })

          .map('CalculateResults', {
            itemsPath: '$.combinations',
            iterator: StateMachineBuilder.new().lambdaInvoke('CalculateResult', {
              lambdaFunction: props.calculateResultFunction,
            }),
          })

          .end()

          .perform(
            new sfnTasks.SnsPublish(definitionScope, 'PublishFileReadError', {
              topic: props.errorTopic,
              message: sfn.TaskInput.fromObject({
                cause: 'An error occurred reading the file',
                fileEvent: '$.fileEvent',
              }),
            })
          )
          .fail('FileReadErrorFailure', { cause: 'An error occurred reading the file' })

          .perform(
            new sfnTasks.SnsPublish(definitionScope, 'PublishUnhandledFileTypeError', {
              topic: props.errorTopic,
              message: sfn.TaskInput.fromObject({
                cause: 'Unhandled FileType',
                fileHeader: '$.fileHeader',
              }),
            })
          )
          .fail('UnhandledFileTypeFailure', { cause: 'Unhandled FileType' })

          .build(definitionScope, {
            defaultProps: {
              lambdaInvoke: {
                payloadResponseOnly: true,
                retryOnServiceExceptions: false,
              },
            },
          }),
    });
  }
}
