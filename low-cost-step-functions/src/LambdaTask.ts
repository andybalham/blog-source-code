import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sns from '@aws-cdk/aws-sns';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import Orchestrator from './Orchestrator';

export interface LambdaTaskProps {
  handlerFunction: lambda.Function;
  eventTopic: sns.ITopic;
}

export default class LambdaTask extends cdk.Construct {
  //
  constructor(scope: cdk.Construct, id: string, props: LambdaTaskProps) {
    super(scope, id);

    props.handlerFunction.addEnvironment(
      Orchestrator.EnvVars.EVENT_TOPIC_ARN,
      props.eventTopic.topicArn
    );

    props.eventTopic.addSubscription(
      new snsSubs.LambdaSubscription(props.handlerFunction, {
        filterPolicy: {
          // TODO 11Sep21: What is the correct policy here? Use id?
        },
      })
    );

    props.eventTopic.grantPublish(props.handlerFunction);
  }
}
