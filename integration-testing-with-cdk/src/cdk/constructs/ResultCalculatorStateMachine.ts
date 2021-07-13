/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as lambda from '@aws-cdk/aws-lambda';
import StateMachineBuilder from '@andybalham/state-machine-builder';
import { FileType } from '../../contracts';

export interface ResultCalculatorStateMachineProps
  extends Omit<sfn.StateMachineProps, 'definition'> {
  fileHeaderReaderFunction: lambda.IFunction;
  combineHeadersFunction: lambda.IFunction;
  calculateResultFunction: lambda.IFunction;
}

export default class ResultCalculatorStateMachine extends sfn.StateMachine {
  //
  constructor(scope: cdk.Construct, id: string, props: ResultCalculatorStateMachineProps) {
    super(scope, id, {
      ...props,
      definition: new StateMachineBuilder()

        .choice('FileType', {
          // TODO 13Jul21: We need a way of loading the header from the S3Key
          choices: [
            {
              when: sfn.Condition.stringEquals('$.fileEvent.fileType', FileType.Configuration),
              next: 'ReadScenarioHeaders',
            },
            {
              when: sfn.Condition.stringEquals('$.fileEvent.fileType', FileType.Scenario),
              next: 'ReadConfigurationHeaders',
            },
          ],
          otherwise: 'UnhandledFileType',
        })

        .lambdaInvoke('ReadConfigurationHeaders', {
          lambdaFunction: props.fileHeaderReaderFunction,
          catches: [{ handler: 'HeaderReadError' }],
          // TODO 13Jul21: Configure the inputs and outputs
        })
        .next('CombineHeaders')

        .lambdaInvoke('ReadScenarioHeaders', {
          lambdaFunction: props.fileHeaderReaderFunction,
          // TODO 13Jul21: Configure the inputs and outputs
          catches: [{ handler: 'HeaderReadError' }],
        })
        .next('CombineHeaders')

        .lambdaInvoke('CombineHeaders', {
          // TODO 13Jul21: Configure the inputs and outputs
          lambdaFunction: props.combineHeadersFunction,
        })

        .map('CalculateResults', {
          iterator: new StateMachineBuilder().lambdaInvoke('CalculateResult', {
            lambdaFunction: props.calculateResultFunction,
            // TODO 13Jul21: Configure the inputs and outputs
          }),
        })

        .end()

        .fail('UnhandledFileType', { cause: 'Unhandled FileType' })

        .fail('HeaderReadError', { cause: 'An error occurred when reading the headers' })

        .build(scope),
    });
  }
}
