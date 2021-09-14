import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sns from '@aws-cdk/aws-sns';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import LambdaTaskHandler from './LambdaTaskHandler';

export interface OrchestratorBaseProps {
  executionTable: dynamodb.ITable;
}

export interface OrchestratorProps extends OrchestratorBaseProps {
  handlerFunction: lambda.Function;
}

export default abstract class Orchestrator extends cdk.Construct {
  //
  static readonly EnvVars = {
    EXECUTION_TABLE_NAME: 'EXECUTION_TABLE_NAME',
    EVENT_TOPIC_ARN: 'EVENT_TOPIC_ARN',
  };

  static readonly ExecutionTableSchema = {
    partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
  };

  readonly handlerFunction: lambda.Function;

  readonly eventTopic: sns.ITopic;

  constructor(scope: cdk.Construct, id: string, props: OrchestratorProps) {
    super(scope, id);

    this.handlerFunction = props.handlerFunction;
    this.eventTopic = new sns.Topic(this, 'EventTopic');

    this.handlerFunction.addEnvironment(
      Orchestrator.EnvVars.EVENT_TOPIC_ARN,
      this.eventTopic.topicArn
    );

    this.handlerFunction.addEnvironment(
      Orchestrator.EnvVars.EXECUTION_TABLE_NAME,
      props.executionTable.tableName
    );

    props.executionTable.grantReadWriteData(this.handlerFunction);

    this.eventTopic.grantPublish(this.handlerFunction);
    this.eventTopic.addSubscription(
      new snsSubs.LambdaSubscription(this.handlerFunction, {
        filterPolicy: {
          // TODO 11Sep21: What is the correct policy here? Use 'Orchestrator'
        },
      })
    );
  }

  static getBaseLambdaTaskEnvironment(
    eventTopic: sns.ITopic
  ): { [key: string]: string } | undefined {
    return {
      [LambdaTaskHandler.Env.EVENT_TOPIC_ARN]: eventTopic.topicArn,
    };
  }
}
