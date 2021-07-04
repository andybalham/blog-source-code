/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';

export function newLogEventFunction(scope: cdk.Construct, id: string): lambda.Function {
  return new lambda.Function(scope, id, {
    handler: 'index.handler',
    runtime: lambda.Runtime.NODEJS_12_X,
    code: lambda.Code.fromInline(
      `exports.handler = (event) => { console.log(JSON.stringify(event, null, 2)) }`
    ),
  });
}

export function newNodejsFunction(
  scope: cdk.Construct,
  functionId: string,
  functionModule: string,
  environment?: Record<string, any>
): lambda.Function {
  //
  const functionEntryBase = path.join(__dirname, '..', '..', '..', 'src', 'functions');

  return new lambdaNodejs.NodejsFunction(scope, functionId, {
    runtime: lambda.Runtime.NODEJS_12_X,
    entry: path.join(functionEntryBase, `${functionModule}.ts`),
    handler: 'handler',
    environment,
  });
}
