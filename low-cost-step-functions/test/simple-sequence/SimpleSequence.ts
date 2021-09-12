/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import { LambdaTask, Orchestrator, OrchestratorHandler, OrchestratorProps } from '../../src';
import { AddTwoNumbersTaskHandler } from './SimpleSequence.AddTwoNumbersHandler';

export type SimpleSequenceProps = Omit<OrchestratorProps, 'handlerFunction'>;

export default class SimpleSequence extends Orchestrator {
  //
  constructor(scope: cdk.Construct, id: string, props: SimpleSequenceProps) {
    super(scope, id, {
      ...props,
      handlerFunction: new lambdaNodejs.NodejsFunction(scope, OrchestratorHandler.name),
    });

    new LambdaTask(this, 'AddTwoNumbersTask', {
      eventTopic: this.eventTopic,
      handlerFunction: new lambdaNodejs.NodejsFunction(this, AddTwoNumbersTaskHandler.name),
    });
  }
}
