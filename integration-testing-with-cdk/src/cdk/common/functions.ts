/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';

// eslint-disable-next-line import/prefer-default-export
export function newLogEventFunction(scope: cdk.Construct, id: string): lambda.Function {
  return new lambda.Function(scope, id, {
    handler: 'index.handler',
    runtime: lambda.Runtime.NODEJS_12_X,
    code: lambda.Code.fromInline(
      `exports.handler = (event) => { console.log(JSON.stringify(event, null, 2)) }`
    ),
  });
}
