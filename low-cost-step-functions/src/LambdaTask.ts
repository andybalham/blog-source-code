import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sns from '@aws-cdk/aws-sns';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';

export interface LambdaTaskProps {
  handlerFunction: lambda.IFunction;
  eventTopic: sns.ITopic;
}

export default abstract class LambdaTask extends cdk.Construct {
  //
  constructor(scope: cdk.Construct, id: string, props: LambdaTaskProps) {
    super(scope, id);

    props.eventTopic.addSubscription(new snsSubs.LambdaSubscription(props.handlerFunction, {
      filterPolicy: {
        // TODO 11Sep21: What is the correct policy here? Use getLambdaId()
      }
    }));

    props.eventTopic.grantPublish(props.handlerFunction);
  }

  abstract getLambdaId(): string;
}
