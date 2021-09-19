import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sns from '@aws-cdk/aws-sns';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import Orchestrator from './Orchestrator';
import AsyncTaskHandler from './AsyncTaskHandler';
import { TaskHandler } from './TaskHandler';

export interface AsyncTaskProps<TReq, TRes> {
  handlerType: new () => AsyncTaskHandler<TReq, TRes>;
  handlerFunction: lambda.Function;
}

export default abstract class AsyncTask<TReq, TRes> extends cdk.Construct {
  //
  readonly handlerFunction: lambda.Function;

  readonly requestTopic: sns.ITopic;

  constructor(orchestrator: Orchestrator, id: string, props: AsyncTaskProps<TReq, TRes>) {
    super(orchestrator, id);

    this.handlerFunction = props.handlerFunction;

    //  Create the request topic, subscribe and allow the orchestrator to publish

    this.requestTopic = new sns.Topic(this, `${props.handlerType.name}RequestTopic`);
    this.requestTopic.addSubscription(new snsSubs.LambdaSubscription(props.handlerFunction));

    orchestrator.handlerFunction.addEnvironment(
      AsyncTask.getRequestTopicArnEnvVarName(props.handlerType),
      this.requestTopic.topicArn
    );
    this.requestTopic.grantPublish(orchestrator.handlerFunction);

    // Allow ourselves to publish responses back to the orchestrator

    props.handlerFunction.addEnvironment(
      Orchestrator.EnvVars.RESPONSE_TOPIC_ARN,
      orchestrator.responseTopic.topicArn
    );
    orchestrator.responseTopic.grantPublish(props.handlerFunction);
  }

  static getRequestTopicArnEnvVarName(handlerType: new () => TaskHandler<any, any>): string {
    return `${handlerType.name.toUpperCase()}_REQUEST_TOPIC_ARN`;
  }
}
