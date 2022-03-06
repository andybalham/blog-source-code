import { ExchangeBase } from './exchange-base';

export interface IdentityCheckRequest extends ExchangeBase {
  firstName: string;
  lastName: string;
  postcode: string;
}

export interface IdentityCheckResponse extends ExchangeBase {
  reference: string;
  electoralRole: boolean;
  bankAccount: boolean;
}
