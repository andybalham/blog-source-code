/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { AsyncTask, Orchestrator } from '../../src';
import AddTwoNumbersTask from './AddTwoNumbersTask';
import { AddTwoNumbersRequest, AddTwoNumbersResponse } from './tasks/PerformNumericOperationTask.handler';

export interface SimpleSequenceProps {
  executionTable: dynamodb.ITable;
}

export default class SimpleSequence extends Orchestrator {
  //
  addTwoNumbersTask: AsyncTask<AddTwoNumbersRequest, AddTwoNumbersResponse>;

  constructor(scope: cdk.Construct, id: string, props: SimpleSequenceProps) {
    super(scope, id, {
      ...props,
      handlerFunction: new lambdaNodejs.NodejsFunction(scope, 'handler'),
    });

    this.addTwoNumbersTask = new AddTwoNumbersTask(this, 'AddTwoNumbersTask');
  }
}
