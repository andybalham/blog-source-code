/* eslint-disable semi */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';

export default interface SelfDeployService<TRes extends cdk.IResource, TProps> {
  newConstruct(scope: cdk.Construct, props: TProps): TRes;
}
