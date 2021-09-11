/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import EmptyOrchestrationTestStack from './empty-orchestration/EmptyOrchestrationTestStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'TestApp');

new EmptyOrchestrationTestStack(app, EmptyOrchestrationTestStack.Id);
