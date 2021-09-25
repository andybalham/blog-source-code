import * as cdk from '@aws-cdk/core';
import { IntegrationTestStack } from '@andybalham/sls-testing-toolkit';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import EmptyOrchestrator from './EmptyOrchestrator';
import { Orchestrator } from '../../src';

export default class EmptyOrchestrationTestStack extends IntegrationTestStack {
  //
  static readonly Id = `EmptyOrchestrationTestStack`;

  static readonly OrchestrationHandlerId = 'nOrchestrationHandler';

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id, {
      testStackId: EmptyOrchestrationTestStack.Id,
    });

    const executionTable = new dynamodb.Table(this, 'ExecutionTable', {
      ...Orchestrator.ExecutionTableSchema,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const sut = new EmptyOrchestrator(this, 'SUT', { executionTable });

    this.addTestResourceTag(
      sut.handlerFunction,
      EmptyOrchestrationTestStack.OrchestrationHandlerId
    );
  }
}
