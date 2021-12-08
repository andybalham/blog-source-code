/* eslint-disable import/no-extraneous-dependencies */
import * as lambda from '@aws-cdk/aws-lambda';

export default abstract class SelfDeployServiceBase {
  constructor(public id: string) {}
  abstract addConfiguration(lambdaFunction: lambda.Function): void;
}
