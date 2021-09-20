/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { Orchestrator } from '../../src';
import PerformNumericOperationTask from './tasks/PerformNumericOperationTask';
import PublishResultTask from './tasks/PublishResultTask';

export interface SimpleBranchingProps {
  executionTable: dynamodb.ITable;
}

export default class SimpleBranching extends Orchestrator {
  //
  readonly performNumericOperationTask: PerformNumericOperationTask;

  readonly publishResultTask: PublishResultTask;

  constructor(scope: cdk.Construct, id: string, props: SimpleBranchingProps) {
    super(scope, id, {
      ...props,
      handlerFunction: new lambdaNodejs.NodejsFunction(scope, 'handler'),
    });

    this.performNumericOperationTask = new PerformNumericOperationTask(
      this,
      'PerformNumericOperationTask'
    );

    this.publishResultTask = new PublishResultTask(this, 'PublishResultTask');
  }
}
