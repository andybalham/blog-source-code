/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import SelfDeployTestStack from '../src/self-deploy/SelfDeployTestStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'SelfDeployLambdaTestApp');

new SelfDeployTestStack(app, 'SelfDeployLambdaTestStack');
