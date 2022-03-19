import { CreditReferenceRating } from './credit-reference';

export interface LoanProcessorState {
  input: LoanProcessorInput;
  creditReferenceRating?: CreditReferenceRating;
  retryCount: number;
}

export interface LoanProcessorInput {
  correlationId: string;
  firstName: string;
  lastName: string;
  postcode: string;
}
