/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';

export default abstract class SelfDeployService<T extends cdk.IResource> {
  constructor(public id: string) {}
  abstract addConfiguration(lambdaFunction: lambda.Function): void;
  abstract newConstruct(scope: cdk.Construct): T;
}
