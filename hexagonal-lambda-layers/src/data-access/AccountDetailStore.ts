/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
import { AccountDetail } from '../domain-contracts/models';
import { IAccountDetailStore } from '../domain-contracts/services';

export default class AccountDetailStore implements IAccountDetailStore {
  constructor(private tableName: string) {
    console.log(JSON.stringify({ tableName: this.tableName }, null, 2));
  }

  listAccountDetailsByCustomerIdAsync(customerId: string): Promise<AccountDetail[]> {
    throw new Error('Method not implemented.');
  }

  updateAccountDetailAsync(account: AccountDetail): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
