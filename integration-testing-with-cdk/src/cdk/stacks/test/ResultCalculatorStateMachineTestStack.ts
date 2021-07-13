/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import { IntegrationTestStack } from '../../../aws-integration-test';
import { newLogEventFunction } from '../../common';
import { ResultCalculatorStateMachine } from '../../constructs';

export default class ResultCalculatorStateMachineTestStack extends IntegrationTestStack {
  //
  static readonly ResourceTagKey = 'ResultCalculatorStateMachineTestStack';

  static readonly StateMachineId = 'SUT';

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testResourceTagKey: ResultCalculatorStateMachineTestStack.ResourceTagKey,
      deployIntegrationTestTable: true,
      deployTestObserverFunction: true,
    });

    const sut = new ResultCalculatorStateMachine(
      this,
      ResultCalculatorStateMachineTestStack.StateMachineId,
      {
        fileHeaderReaderFunction: newLogEventFunction(this, 'MockFileHeaderReaderFunction'),
        combineHeadersFunction: newLogEventFunction(this, 'CombineHeadersFunction'),
        calculateResultFunction: this.testObserverFunction,
      }
    );

    this.addTestResourceTag(sut, ResultCalculatorStateMachineTestStack.StateMachineId);
  }
}
