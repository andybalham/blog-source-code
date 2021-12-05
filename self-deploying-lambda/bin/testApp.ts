/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import SelfDeployLambdaTestStack from '../lib/SelfDeployLambdaTestStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'SelfDeployLambdaTestApp');

new SelfDeployLambdaTestStack(app, 'SelfDeployLambdaTestStack');
