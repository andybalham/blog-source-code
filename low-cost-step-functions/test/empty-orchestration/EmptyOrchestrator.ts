import * as cdk from '@aws-cdk/core';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import { Orchestrator, OrchestratorProps } from '../../src';

export type EmptyOrchestratorProps = Omit<OrchestratorProps, 'handlerFunction'>;

export default class EmptyOrchestrator extends Orchestrator {
  //
  constructor(scope: cdk.Construct, id: string, props: EmptyOrchestratorProps) {
    super(scope, id, {
      ...props,
      handlerFunction: new lambdaNodejs.NodejsFunction(scope, 'handler'),
    });
  }
}
