/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import { IntegrationTestStack } from '@andybalham/sls-testing-toolkit';
import PriorityRouter from './PriorityRouter';

export default class PriorityRouterTestStack extends IntegrationTestStack {
  //
  static readonly StackId = 'SimpleEventRouterTestStack-Test';

  static readonly TestInputTopicId = 'TestInputTopic';

  // static readonly PositiveOutputTopicSubscriberId = 'PositiveOutputTopicSubscriberFunction';

  // static readonly NegativeOutputTopicSubscriberId = 'NegativeOutputTopicSubscriberFunction';

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testStackId: PriorityRouterTestStack.StackId,
      // testFunctionIds: [
      //   SimpleEventRouterTestStack.PositiveOutputTopicSubscriberId,
      //   SimpleEventRouterTestStack.NegativeOutputTopicSubscriberId,
      // ],
    });

    const testInputTopic = new sns.Topic(this, PriorityRouterTestStack.TestInputTopicId);
    this.addTestResourceTag(testInputTopic, PriorityRouterTestStack.TestInputTopicId);

    // eslint-disable-next-line no-new
    new PriorityRouter(this, 'SUT', {
      inputTopic: testInputTopic,
    });

    // this.addSNSTopicSubscriber(
    //   sut.positiveOutputTopic,
    //   SimpleEventRouterTestStack.PositiveOutputTopicSubscriberId
    // );

    // this.addSNSTopicSubscriber(
    //   sut.negativeOutputTopic,
    //   SimpleEventRouterTestStack.NegativeOutputTopicSubscriberId
    // );
  }
}
