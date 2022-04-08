/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
import { Customer } from '../domain-contracts/models';
import { ICustomerStore } from '../domain-contracts/services';

export default class CustomerStore implements ICustomerStore {
  constructor(private tableName: string) {
    console.log(JSON.stringify({ tableName: this.tableName }, null, 2));
  }

  retrieveCustomerAsync(customerId: string): Promise<Customer | null> {
    throw new Error('Method not implemented.');
  }
}
