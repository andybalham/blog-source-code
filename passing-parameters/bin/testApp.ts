/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import MockApiStack from '../lib/MockApiStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'ApplicationCreatedFilterTestApp');

const creditReferenceUrlParameterName = '/credit-reference-api/base-url';

new MockApiStack(app, 'MockApiStack', { creditReferenceUrlParameterName });
