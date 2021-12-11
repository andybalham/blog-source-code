/* eslint-disable import/no-extraneous-dependencies */
import * as lambda from '@aws-cdk/aws-lambda';

export default abstract class SelfDeployServiceBase {
  constructor(public id: string) {}
  abstract configureFunction(lambdaFunction: lambda.Function): void;
}
