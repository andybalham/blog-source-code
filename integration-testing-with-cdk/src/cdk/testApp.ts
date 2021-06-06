/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import FileEventPublisherTestStack from './stacks/test/FileEventPublisherTestStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'AffordabilityTestApp');

new FileEventPublisherTestStack(app, 'FileEventPublisherTestStack');
