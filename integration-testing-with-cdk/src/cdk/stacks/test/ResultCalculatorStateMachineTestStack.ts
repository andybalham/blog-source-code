/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import { IntegrationTestStack } from '../../../aws-integration-test';
import { newLogEventFunction } from '../../common';
import { ResultCalculatorStateMachine } from '../../constructs';

export default class ResultCalculatorStateMachineTestStack extends IntegrationTestStack {
  //
  static readonly ResourceTagKey = 'ResultCalculatorStateMachineTestStack';

  static readonly StateMachineId = 'SUT';

  static readonly FileHeaderReaderMockId = 'FileHeaderReader';

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testResourceTagKey: ResultCalculatorStateMachineTestStack.ResourceTagKey,
      deployIntegrationTestTable: true,
      deployTestObserverFunction: true,
    });

    const fileHeaderReaderMockFunction = this.newMockFunction('FileHeaderReader');

    const sut = new ResultCalculatorStateMachine(
      this,
      ResultCalculatorStateMachineTestStack.StateMachineId,
      {
        fileHeaderReaderFunction: fileHeaderReaderMockFunction,
        combineHeadersFunction: newLogEventFunction(this, 'CombineHeadersFunction'),
        calculateResultFunction: this.testObserverFunction,
      }
    );

    this.addTestResourceTag(sut, ResultCalculatorStateMachineTestStack.StateMachineId);
  }
}
