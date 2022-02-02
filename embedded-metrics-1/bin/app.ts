/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import LoanProcessorTestStack from '../lib/LoanProcessorTestStack';
import MockApiStack from '../lib/MockApiStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'PassingParametersTestApp');

const creditReferenceUrlParameterName = '/mock-apis/credit-reference-api/base-url';

new MockApiStack(app, 'MockApiStack', { creditReferenceUrlParameterName });
new LoanProcessorTestStack(app, 'LoanProcessorTestStack', { creditReferenceUrlParameterName });
