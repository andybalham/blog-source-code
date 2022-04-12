import { CreditReferenceRating } from './credit-reference';
import { RetriableState } from '../retrier/RetriableState';

export interface LoanProcessorState extends RetriableState {
  input: LoanProcessorInput;
  creditReference?: CreditReference;
  identityCheck?: IdentityCheck;
}

export interface LoanProcessorInput {
  firstName: string;
  lastName: string;
  postcode: string;
}

export interface CreditReference {
  creditReferenceRating: CreditReferenceRating;
}

export interface IdentityCheck {
  electoralRole: boolean;
  bankAccount: boolean;
}
