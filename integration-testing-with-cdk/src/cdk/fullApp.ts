/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import FullStack from './stacks/full/FullStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'IntegrationTestingWithCDK');

const fullStack = new FullStack(app, 'FullStack');
cdk.Tags.of(fullStack).add('stack', 'Full');
