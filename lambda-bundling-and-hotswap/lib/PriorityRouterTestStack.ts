/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import { IntegrationTestStack } from '@andybalham/sls-testing-toolkit';
import PriorityRouter from '../src/event-router/PriorityRouter';

export default class PriorityRouterTestStack extends IntegrationTestStack {
  //
  static readonly StackId = 'SimpleEventRouterTestStack';

  static readonly TestInputTopicId = 'TestInputTopic';

  static readonly HighPriorityConsumerId = 'HighPriorityConsumerFunction';

  static readonly NormalPriorityConsumerId = 'NormalPriorityConsumerFunction';

  static readonly HighPriorityThresholdDays = 3;

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testStackId: PriorityRouterTestStack.StackId,
      testFunctionIds: [
        PriorityRouterTestStack.HighPriorityConsumerId,
        PriorityRouterTestStack.NormalPriorityConsumerId,
      ],
    });

    const testInputTopic = new sns.Topic(this, PriorityRouterTestStack.TestInputTopicId);
    this.addTestResourceTag(testInputTopic, PriorityRouterTestStack.TestInputTopicId);

    const sut = new PriorityRouter(this, 'SUT', {
      inputTopic: testInputTopic,
      highPriorityThresholdDays: PriorityRouterTestStack.HighPriorityThresholdDays,
    });

    this.addSQSQueueConsumer(sut.highPriorityQueue, PriorityRouterTestStack.HighPriorityConsumerId);

    this.addSQSQueueConsumer(
      sut.normalPriorityQueue,
      PriorityRouterTestStack.NormalPriorityConsumerId
    );
  }
}
