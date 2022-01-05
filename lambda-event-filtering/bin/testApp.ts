/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import ApplicationCreatedFilterTestStack from '../lib/ApplicationCreatedFilterTestStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'ApplicationCreatedFilterTestApp');

new ApplicationCreatedFilterTestStack(app, 'ApplicationCreatedFilterTestStack');
