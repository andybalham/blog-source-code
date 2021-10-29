/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import * as lambda from '@aws-cdk/aws-lambda';

export interface PriorityRouterProps {
  inputTopic: sns.ITopic;
}

export default class PriorityRouter extends cdk.Construct {
  //
  props: PriorityRouterProps;

  constructor(scope: cdk.Construct, id: string, props: PriorityRouterProps) {
    super(scope, id);

    this.props = props;

    const priorityRouterFunction = new lambda.Function(this, 'PriorityRouterFunction', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('src/event-router/lambda'),
      handler: 'priorityRouter.handler',
    });

    props.inputTopic.addSubscription(new snsSubs.LambdaSubscription(priorityRouterFunction));
  }
}
