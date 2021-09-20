import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { IntegrationTestStack } from '@andybalham/sls-testing-toolkit';
import { Orchestrator } from '../../src';
import SimpleBranching from './SimpleBranching';
import { PerformNumericOperationTaskHandler } from './tasks/PerformNumericOperationTask.handler';
import { PublishResultTaskHandler } from './tasks/PublishResultTask.handler';

export default class SimpleBranchingTestStack extends IntegrationTestStack {
  //
  static readonly Id = `SimpleBranchingTestStack`;

  static readonly OrchestrationHandlerId = 'OrchestrationHandler';

  static readonly ResultTopicId = 'ResultTopic';

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id, {
      testStackId: SimpleBranchingTestStack.Id,
    });

    const executionTable = new dynamodb.Table(this, 'ExecutionTable', {
      ...Orchestrator.ExecutionTableSchema,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const sut = new SimpleBranching(this, 'SUT', {
      executionTable,
    });

    this.addTestResourceTag(sut.handlerFunction, SimpleBranchingTestStack.OrchestrationHandlerId);

    this.addTestResourceTag(
      sut.performNumericOperationTask.handlerFunction,
      PerformNumericOperationTaskHandler.name
    );

    this.addTestResourceTag(sut.publishResultTask.handlerFunction, PublishResultTaskHandler.name);
    this.addTestResourceTag(
      sut.publishResultTask.resultTopic,
      SimpleBranchingTestStack.ResultTopicId
    );
  }
}
