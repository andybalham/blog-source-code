/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import PriorityRouterTestStack from './event-router/PriorityRouterTestStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'PriorityRouterTestApp');

new PriorityRouterTestStack(app, 'PriorityRouterTestStack');
