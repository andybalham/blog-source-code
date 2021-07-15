/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as lambda from '@aws-cdk/aws-lambda';
import StateMachineBuilder from '@andybalham/state-machine-builder';
import { FileType } from '../../contracts';

export interface ResultCalculatorStateMachineProps
  extends Omit<sfn.StateMachineProps, 'definition'> {
  fileHeaderReaderFunction: lambda.IFunction;
  fileHeaderIndexReaderFunction: lambda.IFunction;
  combineHeadersFunction: lambda.IFunction;
  calculateResultFunction: lambda.IFunction;
}

export default class ResultCalculatorStateMachine extends sfn.StateMachine {
  //
  constructor(scope: cdk.Construct, id: string, props: ResultCalculatorStateMachineProps) {
    super(scope, id, {
      ...props,
      definition: StateMachineBuilder.new()

        .lambdaInvoke('FileReader', {
          lambdaFunction: props.fileHeaderReaderFunction,
          catches: [{ handler: 'FileReadError' }],
          parameters: {
            s3Key: '$.fileEvent.s3Key',
          },
          resultPath: '$.fileHeader',
        })

        .choice('FileType', {
          choices: [
            {
              when: sfn.Condition.stringEquals(
                '$.fileHeader.fileType',
                FileType.Configuration
              ),
              next: 'ReadScenarioHeaders',
            },
            {
              when: sfn.Condition.stringEquals(
                '$.fileHeader.fileType',
                FileType.Scenario
              ),
              next: 'ReadConfigurationHeaders',
            },
          ],
          otherwise: 'UnhandledFileType',
        })

        .lambdaInvoke('ReadConfigurationHeaders', {
          lambdaFunction: props.fileHeaderIndexReaderFunction,
          catches: [{ handler: 'HeaderReadError' }],
          parameters: {
            criteriaType: 'FileType',
            fileType: FileType.Configuration,
          },
          resultPath: '$.configurations',
        })
        .next('CombineHeaders')

        .lambdaInvoke('ReadScenarioHeaders', {
          lambdaFunction: props.fileHeaderIndexReaderFunction,
          catches: [{ handler: 'HeaderReadError' }],
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

        .fail('FileReadError', { cause: 'An error occurred reading the file' })

        .fail('UnhandledFileType', { cause: 'Unhandled FileType' })

        .fail('HeaderReadError', { cause: 'An error occurred when reading the headers' })

        .build(scope, {
          defaultProps: {
            lambdaInvoke: {
              payloadResponseOnly: true,
            },
          },
        }),
    });
  }
}
