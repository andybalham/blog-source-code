/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import DeadlineRouterTestStack from '../lib/DeadlineRouterTestStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'DeadlineRouterTestApp');

new DeadlineRouterTestStack(app, 'DeadlineRouterTestStack');
