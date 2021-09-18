import * as cdk from '@aws-cdk/core';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import { Orchestrator } from '../../src';

export default class EmptyOrchestrator extends Orchestrator {
  //
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id, {
      handlerFunction: new lambdaNodejs.NodejsFunction(scope, 'handler'),
    });
  }
}
