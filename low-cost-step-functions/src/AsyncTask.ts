import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sns from '@aws-cdk/aws-sns';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import Orchestrator from './Orchestrator';
import AsyncTaskHandler from './AsyncTaskHandler';

export interface AsyncTaskProps<TReq, TRes> {
  handlerType: new () => AsyncTaskHandler<TReq, TRes>;
  handlerFunction: lambda.Function;
}

export default abstract class AsyncTask<TReq, TRes> extends cdk.Construct {
  //
  readonly requestTopic: sns.ITopic;

  constructor(orchestrator: Orchestrator, id: string, props: AsyncTaskProps<TReq, TRes>) {
    super(orchestrator, id);

    props.handlerFunction.addEnvironment(
      Orchestrator.EnvVars.RESPONSE_EVENT_TOPIC_ARN,
      orchestrator.responseTopic.topicArn
    );

    orchestrator.responseTopic.grantPublish(props.handlerFunction);

    this.requestTopic = new sns.Topic(this, `${props.handlerType.name}RequestTopic`);
    this.requestTopic.addSubscription(new snsSubs.LambdaSubscription(props.handlerFunction));

    orchestrator.handlerFunction.addEnvironment(
      AsyncTask.getRequestTopicArnEnvVarName(props.handlerType),
      this.requestTopic.topicArn
    );
  }

  static getRequestTopicArnEnvVarName<TReq, TRes>(
    handlerType: new () => AsyncTaskHandler<TReq, TRes>
  ): string {
    return `${handlerType.name.toUpperCase()}_REQUEST_TOPIC_ARN`;
  }
}
