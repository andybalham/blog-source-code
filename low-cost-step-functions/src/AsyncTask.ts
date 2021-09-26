import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sns from '@aws-cdk/aws-sns';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import Orchestrator from './Orchestrator';
import { TaskHandler } from './TaskHandler';
import { AsyncTaskEnvVars } from './AsyncTaskEnvVars';
import AsyncTaskHandler from './AsyncTaskHandler';

export interface AsyncTaskProps<TReq, TRes> {
  handlerType: new () => AsyncTaskHandler<TReq, TRes>;
  handlerFunction: lambda.Function;
}

export default abstract class AsyncTask<TReq, TRes> extends cdk.Construct {
  //
  readonly handlerFunction: lambda.Function;

  readonly requestTopic: sns.ITopic;

  constructor(
    orchestrator: Orchestrator,
    id: string,
    props: AsyncTaskProps<TReq, TRes>
  ) {
    super(orchestrator, id);

    this.handlerFunction = props.handlerFunction;

    //  Create the request topic, subscribe and allow the orchestrator to publish

    this.requestTopic = new sns.Topic(this, `RequestTopic`);
    this.requestTopic.addSubscription(
      new snsSubs.LambdaSubscription(props.handlerFunction)
    );

    this.requestTopic.grantPublish(orchestrator.handlerFunction);
    orchestrator.handlerFunction.addEnvironment(
      AsyncTask.getRequestTopicArnEnvVarName(props.handlerType),
      this.requestTopic.topicArn
    );

    // Allow ourselves to publish responses back to the orchestrator

    orchestrator.responseTopic.grantPublish(props.handlerFunction);
    props.handlerFunction.addEnvironment(
      AsyncTaskEnvVars.RESPONSE_TOPIC_ARN,
      orchestrator.responseTopic.topicArn
    );
  }

  static getRequestTopicArnEnvVarName(
    handlerType: new () => TaskHandler<any, any>
  ): string {
    let envVarName = `${handlerType.name.toUpperCase()}_REQUEST_TOPIC_ARN`;
    if (envVarName.startsWith('_')) {
      // For some reason, the name sometimes comes back with a starting underscore
      envVarName = envVarName.substring(1);
    }
    return envVarName;
  }
}
