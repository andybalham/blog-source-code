import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sns from '@aws-cdk/aws-sns';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import Orchestrator from './Orchestrator';
import LambdaTaskHandler from './LambdaTaskHandler';

export interface LambdaTaskBaseProps {
  eventTopic: sns.ITopic;
}

export interface LambdaTaskProps<TReq, TRes> extends LambdaTaskBaseProps {
  handlerType: new () => LambdaTaskHandler<TReq, TRes>;
  handlerFunction: lambda.Function;
}

export default abstract class LambdaTask<TReq, TRes> extends cdk.Construct {
  //
  constructor(scope: cdk.Construct, id: string, props: LambdaTaskProps<TReq, TRes>) {
    super(scope, id);

    props.handlerFunction.addEnvironment(
      Orchestrator.EnvVars.EVENT_TOPIC_ARN,
      props.eventTopic.topicArn
    );

    props.eventTopic.addSubscription(
      new snsSubs.LambdaSubscription(props.handlerFunction, {
        filterPolicy: {
          // TODO 11Sep21: What is the correct policy here? props.handlerType.name
        },
      })
    );

    props.eventTopic.grantPublish(props.handlerFunction);
  }
}
