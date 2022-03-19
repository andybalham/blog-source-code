/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/prefer-default-export */
import { SQSEvent } from 'aws-lambda/trigger/sqs';
import { LoanProcessorState } from '../contracts/loan-processor';

export const handler = async (failureEvent: SQSEvent): Promise<LoanProcessorState> => {
  //
  console.log(JSON.stringify({ failureEvent }, null, 2));

  // TODO 19Mar22: Extract the state, increment the retry count, check the retry count, and return it

  const dummyLoanProcessorState: LoanProcessorState = {
    input: {
      correlationId: '',
      firstName: '',
      lastName: '',
      postcode: '',
    },
    retryCount: 0,
  };

  return dummyLoanProcessorState;
};
