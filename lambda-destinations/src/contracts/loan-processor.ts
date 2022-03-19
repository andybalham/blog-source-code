import { CreditReferenceRating } from './credit-reference';

export interface LoanProcessorState {
  input: LoanProcessorInput;
  creditReference?: CreditReference;
  identityCheck?: IdentityCheck;
  retryCount: number;
}

export interface LoanProcessorInput {
  correlationId: string;
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
