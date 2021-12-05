/* eslint-disable import/no-extraneous-dependencies */
import * as lambda from '@aws-cdk/aws-lambda';

export enum SelfDeployServiceType {
  Topic,
}

export default abstract class SelfDeployService {
  abstract getType(): SelfDeployServiceType;
  abstract addConfiguration(fn: lambda.Function): void;
}
