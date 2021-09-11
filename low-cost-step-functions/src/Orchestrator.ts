import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';

export default class Orchestrator extends cdk.Construct {
  //
  readonly handler: lambda.IFunction;

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    this.handler = new lambdaNodejs.NodejsFunction(this, 'handler');

    // TODO 11Sep21: How do we extend the behaviour of the basic handler?
  }
}
