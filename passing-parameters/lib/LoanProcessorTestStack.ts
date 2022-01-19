/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import { IntegrationTestStack } from '@andybalham/sls-testing-toolkit';
import * as cdk from '@aws-cdk/core';
import LoanProcessor from '../src/LoanProcessor';

export interface LoanProcessorTestStackProps {
  creditReferenceUrlParameterName: string;
}

export default class LoanProcessorTestStack extends IntegrationTestStack {
  //
  static readonly StackId = 'LoanProcessorTestStack';

  static readonly CreditReferenceProxyFunctionId = 'CreditReferenceFunction';

  constructor(scope: cdk.Construct, id: string, props: LoanProcessorTestStackProps) {
    super(scope, id, {
      testStackId: LoanProcessorTestStack.StackId,
    });

    const loanProcessor = new LoanProcessor(this, 'LoanProcessor', {
      creditReferenceUrlParameterName: props.creditReferenceUrlParameterName,
    });

    this.addTestResourceTag(
      loanProcessor.creditReferenceProxyFunction,
      LoanProcessorTestStack.CreditReferenceProxyFunctionId
    );
  }
}
