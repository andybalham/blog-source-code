import * as cdk from '@aws-cdk/core';
import { IntegrationTestStack } from '@andybalham/sls-testing-toolkit';
import { Orchestrator } from '../../src';

export default class EmptyOrchestrationTestStack extends IntegrationTestStack {
  //
  static readonly Id = `EmptyOrchestrationTestStack`;

  static readonly OrchestrationHandlerId = 'OrchestrationHandler';

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id, {
      testStackId: EmptyOrchestrationTestStack.Id,
    });

    const sut = new Orchestrator(this, 'SUT');

    this.addTestResourceTag(sut.handler, EmptyOrchestrationTestStack.OrchestrationHandlerId);
  }
}
