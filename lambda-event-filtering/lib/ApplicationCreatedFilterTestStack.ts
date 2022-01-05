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

  static readonly PostcodeFilterConsumerId = 'PostcodeFilterConsumerFunction';

  static readonly HighValueAmountThresholdAmount = 666000;

  static readonly PostcodeFilter = ['MK', 'PR'];

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testStackId: ApplicationCreatedFilterTestStack.StackId,
      testFunctionIds: [
        ApplicationCreatedFilterTestStack.HighValueConsumerId,
        ApplicationCreatedFilterTestStack.PostcodeFilterConsumerId,
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
      highValueThresholdFunction:
        this.testFunctions[ApplicationCreatedFilterTestStack.HighValueConsumerId],
      highValueThresholdAmount: ApplicationCreatedFilterTestStack.HighValueAmountThresholdAmount,
      postcodeFilterFunction:
        this.testFunctions[ApplicationCreatedFilterTestStack.PostcodeFilterConsumerId],
      postcodeFilter: ApplicationCreatedFilterTestStack.PostcodeFilter,
    });

    // new cdk.CfnOutput(this, 'RouterFunctionId', {
    //   value: sut.routerFunction.node.id,
    //   description: 'The id of the router function',
    // });

    // new cdk.CfnOutput(this, 'RouterFunctionName', {
    //   value: sut.routerFunction.functionName,
    //   description: 'The name of the router function',
    // });
  }
}
