import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sns from '@aws-cdk/aws-sns';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import * as dynamodb from '@aws-cdk/aws-dynamodb';

export interface OrchestratorProps {
  handlerFunction: lambda.IFunction;
  executionTable: dynamodb.ITable;
}

export default abstract class Orchestrator extends cdk.Construct {
  //
  static readonly ExecutionTableSchema = {
    partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
  };

  readonly handlerFunction: lambda.IFunction;

  readonly eventTopic: sns.ITopic;

  constructor(scope: cdk.Construct, id: string, props: OrchestratorProps) {
    super(scope, id);

    this.handlerFunction = props.handlerFunction;
    this.eventTopic = new sns.Topic(this, 'EventTopic');

    this.eventTopic.grantPublish(props.handlerFunction);
    this.eventTopic.addSubscription(
      new snsSubs.LambdaSubscription(props.handlerFunction, {
        filterPolicy: {
          // TODO 11Sep21: What is the correct policy here? Use 'Orchestrator'
        },
      })
    );

    props.executionTable.grantReadWriteData(props.handlerFunction);
  }
}
