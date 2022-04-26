/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import { IntegrationTestStack } from '@andybalham/sls-testing-toolkit';
import * as cdk from '@aws-cdk/core';
import LoanProcessor from '../src/loan-processor/LoanProcessor';
import Retrier from '../src/retrier/Retrier';

export interface LoanProcessorTestStackProps {
  creditReferenceUrlParameterName: string;
  identityCheckUrlParameterName: string;
}

export default class LoanProcessorTestStack extends IntegrationTestStack {
  //
  static readonly StackId = 'LoanProcessorTestStack';

  static readonly LoanProcessorInputId = 'LoanProcessorInput';

  static readonly LoanProcessorOutputId = 'LoanProcessorOutput';

  constructor(scope: cdk.Construct, id: string, props: LoanProcessorTestStackProps) {
    super(scope, id, {
      testStackId: LoanProcessorTestStack.StackId,
      testFunctionIds: [
        LoanProcessorTestStack.LoanProcessorOutputId,
      ],
    });

    const loanProcessor = new LoanProcessor(this, 'LoanProcessor', {
      creditReferenceUrlParameterName: props.creditReferenceUrlParameterName,
      identityCheckUrlParameterName: props.identityCheckUrlParameterName,
    });

    new Retrier(this, 'Retrier', {
      failureQueue: loanProcessor.failureQueue,
      retryFunction: loanProcessor.inputFunction,
    });

    // this.addSQSQueueConsumer(
    //   loanProcessor.outputQueue,
    //   LoanProcessorTestStack.LoanProcessorOutputId
    // );

    this.addTestResourceTag(
      loanProcessor.inputFunction,
      LoanProcessorTestStack.LoanProcessorInputId
    );
  }
}
