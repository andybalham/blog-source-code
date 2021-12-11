/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import SelfDeployServiceBase from './SelfDeployServiceBase';

export default abstract class SelfDeployService<
  TRes extends cdk.IResource,
  TProps
> extends SelfDeployServiceBase {
  abstract newConstruct(scope: cdk.Construct, props: TProps): TRes;
}
