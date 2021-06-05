/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import FileEventPublisherTestStack from './stacks/FileEventPublisherTestStack';
import FullStack from './stacks/FullStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'integration-testing-with-cdk');

const fullStack = new FullStack(app, 'FullStack', {});
cdk.Tags.of(fullStack).add('stack', 'Full');

const fileEventPublisherTestStack = new FileEventPublisherTestStack(app, 'FileEventPublisherTestStack');
cdk.Tags.of(fileEventPublisherTestStack).add('stack', 'FileEventPublisherTestStack');
