/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import { Orchestrator, OrchestratorBaseProps } from '../../src';
import AddTwoNumbersTask from './AddTwoNumbersTask';

export default class SimpleSequence extends Orchestrator {
  //
  constructor(scope: cdk.Construct, id: string, props: OrchestratorBaseProps) {
    super(scope, id, {
      ...props,
      handlerFunction: new lambdaNodejs.NodejsFunction(scope, "handler"),
    });

    new AddTwoNumbersTask(this, 'AddTwoNumbersTask', {
      eventTopic: this.eventTopic,
    });
  }
}
