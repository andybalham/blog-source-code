/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import BucketIndexerTestStack from '../lib/BucketIndexerTestStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'BucketIndexerTestApp');

new BucketIndexerTestStack(app, 'BucketIndexerTestStack');
