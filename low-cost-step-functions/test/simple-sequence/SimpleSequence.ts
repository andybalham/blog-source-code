/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { Orchestrator } from '../../src';
import AddTwoNumbers from './AddTwoNumbers';
import { SimpleSequenceHandler } from './SimpleSequence.SimpleSequenceHandler';
import { AddTwoNumbersHandler } from './AddTwoNumbers.AddTwoNumbersHandler';

export interface SimpleSequenceProps {
  executionTable: dynamodb.ITable;
}

export default class SimpleSequence extends Orchestrator {
  //
  addTwoNumbers: AddTwoNumbers;

  constructor(scope: cdk.Construct, id: string, props: SimpleSequenceProps) {
    super(scope, id, {
      ...props,
      handlerFunction: new lambdaNodejs.NodejsFunction(
        scope,
        SimpleSequenceHandler.name
      ),
    });

    this.addTwoNumbers = new AddTwoNumbers(this, AddTwoNumbersHandler.name);
  }
}
