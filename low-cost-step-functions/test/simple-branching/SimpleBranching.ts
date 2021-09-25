/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { Orchestrator } from '../../src';
import { PerformNumericOperation, PublishResult } from './tasks';
import { SimpleBranchingHandler } from './SimpleBranching.SimpleBranchingHandler';

export interface SimpleBranchingProps {
  executionTable: dynamodb.ITable;
}

export default class SimpleBranching extends Orchestrator {
  //
  readonly performNumericOperationTask: PerformNumericOperation;

  readonly publishResultTask: PublishResult;

  constructor(scope: cdk.Construct, id: string, props: SimpleBranchingProps) {
    super(scope, id, {
      ...props,
      handlerFunction: new lambdaNodejs.NodejsFunction(scope, SimpleBranchingHandler.name),
    });

    this.performNumericOperationTask = new PerformNumericOperation(
      this,
      'PerformNumericOperationTask'
    );

    this.publishResultTask = new PublishResult(this, 'PublishResultTask');
  }
}
