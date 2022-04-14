/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import LoanProcessorTestStack from '../lib/LoanProcessorTestStack';
import MockApiStack from '../lib/MockApiStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'EmbeddedMetricsTestApp2');

const creditReferenceUrlParameterName = '/mock-apis/credit-reference-api/base-url';
const identityCheckUrlParameterName = '/mock-apis/identity-check-api/base-url';

new MockApiStack(app, 'RetrierMockApiStack', {
  creditReferenceUrlParameterName,
  identityCheckUrlParameterName,
});

new LoanProcessorTestStack(app, 'RetrierLoanProcessorTestStack', {
  creditReferenceUrlParameterName,
  identityCheckUrlParameterName,
});
