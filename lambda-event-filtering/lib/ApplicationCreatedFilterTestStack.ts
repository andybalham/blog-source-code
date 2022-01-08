/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import { IntegrationTestStack } from '@andybalham/sls-testing-toolkit';
import ApplicationCreatedFilter from '../src/ApplicationCreatedFilter';

export default class ApplicationCreatedFilterTestStack extends IntegrationTestStack {
  //
  static readonly StackId = 'ApplicationCreatedFilterTestStack';

  static readonly ApplicationEventTopicId = 'ApplicationEventTopic';

  static readonly HighValueConsumerId = 'HighValueConsumerFunction';

  static readonly PostcodeConsumerId = 'PostcodeFilterConsumerFunction';

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testStackId: ApplicationCreatedFilterTestStack.StackId,
      testFunctionIds: [
        ApplicationCreatedFilterTestStack.HighValueConsumerId,
        ApplicationCreatedFilterTestStack.PostcodeConsumerId,
      ],
    });

    const applicationEventTopic = new sns.Topic(
      this,
      ApplicationCreatedFilterTestStack.ApplicationEventTopicId
    );
    this.addTestResourceTag(
      applicationEventTopic,
      ApplicationCreatedFilterTestStack.ApplicationEventTopicId
    );

    new ApplicationCreatedFilter(this, 'SUT', {
      applicationEventTopic,
      highValueFunction:
        this.testFunctions[ApplicationCreatedFilterTestStack.HighValueConsumerId],
      postcodeFunction:
        this.testFunctions[ApplicationCreatedFilterTestStack.PostcodeConsumerId],
    });
  }
}
