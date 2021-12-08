/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import SelfDeployServiceBase from './SelfDeployServiceBase';

export default abstract class SelfDeployService<
  T extends cdk.IResource
> extends SelfDeployServiceBase {
  abstract newConstruct(scope: cdk.Construct): T;
}
