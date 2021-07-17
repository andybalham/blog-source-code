/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import { IntegrationTestStack } from '../../../aws-integration-test';
import { ResultCalculatorStateMachine } from '../../constructs';
import writeGraphJson from './writeGraphJson';

export default class ResultCalculatorStateMachineTestStack extends IntegrationTestStack {
  //
  static readonly ResourceTagKey = 'ResultCalculatorStateMachineTestStack';

  static readonly StateMachineId = 'ResultCalculatorStateMachine';

  static readonly FileHeaderReaderMockId = 'FileHeaderReaderMock';

  static readonly FileHeaderIndexReaderMockId = 'FileHeaderIndexReaderMock';

  static readonly CombineHeadersMockId = 'CombineHeadersMock';

  static readonly ResultCalculatorObserverId = 'ResultCalculatorObserver';

  static readonly ErrorTopicObserverId = 'ErrorTopicObserver';

  constructor(scope: cdk.Construct, id: string) {
    //
    // Declare the observers and the mocks

    super(scope, id, {
      testResourceTagKey: ResultCalculatorStateMachineTestStack.ResourceTagKey,
      observerFunctionIds: [
        ResultCalculatorStateMachineTestStack.ResultCalculatorObserverId,
        ResultCalculatorStateMachineTestStack.ErrorTopicObserverId,
      ],
      mockFunctionIds: [
        ResultCalculatorStateMachineTestStack.FileHeaderReaderMockId,
        ResultCalculatorStateMachineTestStack.FileHeaderIndexReaderMockId,
        ResultCalculatorStateMachineTestStack.CombineHeadersMockId,
      ],
    });

    // Test error topic and observer

    const testErrorTopic = new sns.Topic(this, 'TestErrorTopic');

    testErrorTopic.addSubscription(
      new snsSubs.LambdaSubscription(
        this.observerFunctions[ResultCalculatorStateMachineTestStack.ErrorTopicObserverId]
      )
    );

    // System under test

    const sut = new ResultCalculatorStateMachine(
      this,
      ResultCalculatorStateMachineTestStack.StateMachineId,
      {
        fileHeaderReaderFunction:
          this.mockFunctions[ResultCalculatorStateMachineTestStack.FileHeaderReaderMockId],
        fileHeaderIndexReaderFunction:
          this.mockFunctions[ResultCalculatorStateMachineTestStack.FileHeaderIndexReaderMockId],
        combineHeadersFunction:
          this.mockFunctions[ResultCalculatorStateMachineTestStack.CombineHeadersMockId],
        calculateResultFunction:
          this.observerFunctions[ResultCalculatorStateMachineTestStack.ResultCalculatorObserverId],
        errorTopic: testErrorTopic,
      }
    );

    this.addTestResourceTag(sut, ResultCalculatorStateMachineTestStack.StateMachineId);

    // Output the graph JSON to help with development

    writeGraphJson(sut);
  }
}
