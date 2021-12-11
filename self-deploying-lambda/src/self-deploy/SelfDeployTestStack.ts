/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import { IntegrationTestStack } from '@andybalham/sls-testing-toolkit';
import {
  eventPublishingFunction,
  itemPutterFunction,
  loggingFunction,
  testTable,
  testTopic,
} from './selfDeployApplication';

export default class SelfDeployTestStack extends IntegrationTestStack {
  //
  static readonly StackId = 'SelfDeployLambdaTestStack';

  static readonly TestInputTopicId = 'TestInputTopic';

  static readonly LoggingFunctionId = 'LoggingFunction';

  static readonly EventPublishingFunctionId = 'EventPublishingFunction';

  static readonly TestTopicObserverId = 'TestTopicObserver';

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testStackId: SelfDeployTestStack.StackId,
      testFunctionIds: [SelfDeployTestStack.TestTopicObserverId],
    });

    const loggingFunctionConstruct = loggingFunction.newConstruct(this);

    const testTopicConstruct = testTopic.newConstruct(this);
    const eventPublishingFunctionConstruct = eventPublishingFunction.newConstruct(this);

    testTable.newConstruct(this, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    itemPutterFunction.newConstruct(this);

    this.addTestResourceTag(loggingFunctionConstruct, SelfDeployTestStack.LoggingFunctionId);
    this.addTestResourceTag(
      eventPublishingFunctionConstruct,
      SelfDeployTestStack.EventPublishingFunctionId
    );
    this.addSNSTopicSubscriber(testTopicConstruct, SelfDeployTestStack.TestTopicObserverId);
  }
}
