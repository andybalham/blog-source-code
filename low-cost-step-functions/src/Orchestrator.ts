/* eslint-disable @typescript-eslint/no-use-before-define */
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sns from '@aws-cdk/aws-sns';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { OrchestratorEnvVars } from './OrchestratorEnvVars';

export interface OrchestratorProps {
  executionTable: dynamodb.ITable;
  handlerFunction: lambda.Function;
}

export default abstract class Orchestrator extends cdk.Construct {
  //
  static readonly ExecutionTableSchema = {
    partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
  };

  readonly handlerFunction: lambda.Function;

  readonly responseTopic: sns.ITopic;

  constructor(scope: cdk.Construct, id: string, props: OrchestratorProps) {
    super(scope, id);

    this.handlerFunction = props.handlerFunction;

    this.handlerFunction.addEnvironment(
      OrchestratorEnvVars.EXECUTION_TABLE_NAME,
      props.executionTable?.tableName
    );
    props.executionTable.grantReadWriteData(this.handlerFunction);

    this.responseTopic = new sns.Topic(this, 'ResponseTopic');
    this.responseTopic.addSubscription(new snsSubs.LambdaSubscription(this.handlerFunction));
  }
}
