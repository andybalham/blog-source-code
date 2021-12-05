/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import { IntegrationTestStack } from '@andybalham/sls-testing-toolkit';
import {
  eventPublishingFunction,
  loggingFunction,
  testTopic,
} from '../src/self-deploy/application';

export default class SelfDeployLambdaTestStack extends IntegrationTestStack {
  //
  static readonly StackId = 'SelfDeployLambdaTestStack';

  static readonly TestInputTopicId = 'TestInputTopic';

  static readonly LoggingFunctionId = 'LoggingFunction';

  static readonly EventPublishingFunctionId = 'EventPublishingFunction';

  static readonly TestTopicObserverId = 'TestTopicObserver';

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testStackId: SelfDeployLambdaTestStack.StackId,
      testFunctionIds: [SelfDeployLambdaTestStack.TestTopicObserverId],
    });

    const loggingFunctionConstruct = loggingFunction.newConstruct(this);
    const testTopicConstruct = testTopic.newConstruct(this);
    const eventPublishingFunctionConstruct = eventPublishingFunction.newConstruct(this);

    this.addTestResourceTag(loggingFunctionConstruct, SelfDeployLambdaTestStack.LoggingFunctionId);
    this.addTestResourceTag(
      eventPublishingFunctionConstruct,
      SelfDeployLambdaTestStack.EventPublishingFunctionId
    );
    this.addSNSTopicSubscriber(testTopicConstruct, SelfDeployLambdaTestStack.TestTopicObserverId);
  }
}
