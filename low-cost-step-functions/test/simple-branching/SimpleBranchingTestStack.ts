import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { IntegrationTestStack } from '@andybalham/sls-testing-toolkit';
import { Orchestrator } from '../../src';
import SimpleBranching from './SimpleBranching';
import { PerformNumericOperationTaskHandler } from './tasks/PerformNumericOperationTask.PerformNumericOperationHandler';
import { PublishResultTaskHandler } from './tasks/PublishResultTask.PublishResultHandler';

export default class SimpleBranchingTestStack extends IntegrationTestStack {
  //
  static readonly Id = `SimpleBranchingTestStack`;

  static readonly OrchestrationHandlerId = 'OrchestrationHandler';

  static readonly ResultTopicObserverId = 'ResultTopicObserver';

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id, {
      testStackId: SimpleBranchingTestStack.Id,
      testFunctionIds: [SimpleBranchingTestStack.ResultTopicObserverId],
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

    this.addSNSTopicSubscriber(
      sut.publishResultTask.resultTopic,
      SimpleBranchingTestStack.ResultTopicObserverId
    );

    // Tag the resources to keep their logs trimmed
    this.addTestResourceTag(
      sut.performNumericOperationTask.handlerFunction,
      PerformNumericOperationTaskHandler.name
    );
    this.addTestResourceTag(sut.publishResultTask.handlerFunction, PublishResultTaskHandler.name);
  }
}
