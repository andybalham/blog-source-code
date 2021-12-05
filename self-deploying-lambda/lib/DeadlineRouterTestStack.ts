/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import { IntegrationTestStack } from '@andybalham/sls-testing-toolkit';
import DeadlineRouter from '../src/event-router/DeadlineRouter';

export default class DeadlineRouterTestStack extends IntegrationTestStack {
  //
  static readonly StackId = 'DeadlineRouterTestStack';

  static readonly TestInputTopicId = 'TestInputTopic';

  static readonly HighPriorityConsumerId = 'HighPriorityConsumerFunction';

  static readonly NormalPriorityConsumerId = 'NormalPriorityConsumerFunction';

  static readonly HighPriorityThresholdDays = 3;

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testStackId: DeadlineRouterTestStack.StackId,
      testFunctionIds: [
        DeadlineRouterTestStack.HighPriorityConsumerId,
        DeadlineRouterTestStack.NormalPriorityConsumerId,
      ],
    });

    const testInputTopic = new sns.Topic(this, DeadlineRouterTestStack.TestInputTopicId);
    this.addTestResourceTag(testInputTopic, DeadlineRouterTestStack.TestInputTopicId);

    const sut = new DeadlineRouter(this, 'SUT', {
      inputTopic: testInputTopic,
      highPriorityThresholdDays: DeadlineRouterTestStack.HighPriorityThresholdDays,
    });

    this.addSQSQueueConsumer(sut.highPriorityQueue, DeadlineRouterTestStack.HighPriorityConsumerId);

    this.addSQSQueueConsumer(
      sut.normalPriorityQueue,
      DeadlineRouterTestStack.NormalPriorityConsumerId
    );

    new cdk.CfnOutput(this, 'RouterFunctionId', {
      value: sut.routerFunction.node.id,
      description: 'The id of the router function',
    });

    new cdk.CfnOutput(this, 'RouterFunctionName', {
      value: sut.routerFunction.functionName,
      description: 'The name of the router function',
    });
  }
}
