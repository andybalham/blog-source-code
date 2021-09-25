import * as cdk from '@aws-cdk/core';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { Orchestrator } from '../../src';

export interface EmptyOrchestratorProps {
  executionTable: dynamodb.ITable;
}

export default class EmptyOrchestrator extends Orchestrator {
  //
  constructor(scope: cdk.Construct, id: string, props: EmptyOrchestratorProps) {
    super(scope, id, {
      handlerFunction: new lambdaNodejs.NodejsFunction(scope, 'handler'),
      executionTable: props.executionTable,
    });
  }
}
