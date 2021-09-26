import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { IntegrationTestStack } from '@andybalham/sls-testing-toolkit';
import { Orchestrator } from '../../src';
import SimpleSequence from './SimpleSequence';
import { AddTwoNumbersHandler } from './AddTwoNumbers.AddTwoNumbersHandler';

export default class SimpleSequenceTestStack extends IntegrationTestStack {
  //
  static readonly Id = `SimpleSequenceTestStack`;

  static readonly OrchestrationHandlerId = 'OrchestrationHandler';

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id, {
      testStackId: SimpleSequenceTestStack.Id,
    });

    const executionTable = new dynamodb.Table(this, 'ExecutionTable', {
      ...Orchestrator.ExecutionTableSchema,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const sut = new SimpleSequence(this, 'SUT', {
      executionTable,
    });

    this.addTestResourceTag(sut.handlerFunction, SimpleSequenceTestStack.OrchestrationHandlerId);

    this.addTestResourceTag(sut.addTwoNumbers.handlerFunction, AddTwoNumbersHandler.name);
  }
}
