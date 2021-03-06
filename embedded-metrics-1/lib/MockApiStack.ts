/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import CreditReferenceApi from '../src/mock-apis/CreditReferenceApi';

export interface MockApiStackProps {
  creditReferenceUrlParameterName: string;
}

export default class MockApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: MockApiStackProps) {
    super(scope, id);

    new CreditReferenceApi(this, 'CreditReferenceApi', {
      urlParameterName: props.creditReferenceUrlParameterName,
    });
  }
}
