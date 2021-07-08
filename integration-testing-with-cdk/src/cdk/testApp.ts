/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import FileEventPublisherTestStack from './stacks/test/FileEventPublisherTestStack-v2';
import FileHeaderIndexerTestStack from './stacks/test/FileHeaderIndexTestStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'AffordabilityTestApp');

new FileEventPublisherTestStack(app, 'FileEventPublisherTestStack');
new FileHeaderIndexerTestStack(app, 'FileHeaderIndexerTestStack');
