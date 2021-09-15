import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sns from '@aws-cdk/aws-sns';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import Orchestrator from './Orchestrator';
import LambdaTaskHandler from './LambdaTaskHandler';

export interface LambdaTaskBaseProps {
  orchestrator: Orchestrator;
}

export interface LambdaTaskProps<TReq, TRes> extends LambdaTaskBaseProps {
  handlerType: new () => LambdaTaskHandler<TReq, TRes>;
  handlerFunction: lambda.Function;
}

export default abstract class LambdaTask<TReq, TRes> extends cdk.Construct {
  //
  readonly requestTopic: sns.ITopic;

  constructor(scope: cdk.Construct, id: string, props: LambdaTaskProps<TReq, TRes>) {
    super(scope, id);

    props.handlerFunction.addEnvironment(
      Orchestrator.EnvVars.RESPONSE_EVENT_TOPIC_ARN,
      props.orchestrator.responseTopic.topicArn
    );

    props.orchestrator.responseTopic.grantPublish(props.handlerFunction);

    this.requestTopic = new sns.Topic(this, `${props.handlerType.name}RequestTopic`);
    this.requestTopic.addSubscription(new snsSubs.LambdaSubscription(props.handlerFunction));

    props.orchestrator.handlerFunction.addEnvironment(
      LambdaTask.getRequestTopicArnEnvVarName(props.handlerType),
      this.requestTopic.topicArn
    );
  }

  static getRequestTopicArnEnvVarName<TReq, TRes>(
    handlerType: new () => LambdaTaskHandler<TReq, TRes>
  ): string {
    return `${handlerType.name.toUpperCase()}_REQUEST_TOPIC_ARN`;
  }
}
