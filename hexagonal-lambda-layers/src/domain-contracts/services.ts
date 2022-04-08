import { AccountDetail, Customer } from './models';

export interface ICustomerStore {
  retrieveCustomerAsync(customerId: string): Promise<Customer | null>;
}

export interface IAccountDetailStore {
  listAccountDetailsByCustomerIdAsync(customerId: string): Promise<AccountDetail[]>;
  updateAccountDetailAsync(account: AccountDetail): Promise<void>;
}
