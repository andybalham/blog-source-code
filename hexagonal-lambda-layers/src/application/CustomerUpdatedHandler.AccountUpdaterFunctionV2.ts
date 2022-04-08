/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/extensions, import/no-absolute-path */
import { SNSEvent } from 'aws-lambda';
import AccountDetailStore from '../data-access/AccountDetailStore';
import CustomerStore from '../data-access/CustomerStore';
import {
  CustomerUpdatedEvent,
  IAccountDetailStore,
  ICustomerStore,
} from '/packages/domain-contracts';

export class AccountUpdaterFunction {
  constructor(
    private customerStore: ICustomerStore,
    private accountDetailsStore: IAccountDetailStore
  ) {}

  async handleAsync(event: CustomerUpdatedEvent): Promise<void> {
    //
    const customer = await this.customerStore.retrieveCustomerAsync(event.customerId);

    if (!customer) {
      throw new Error(`No customer found for event: ${JSON.stringify(event)}`);
    }

    const accountDetails = await this.accountDetailsStore.listAccountDetailsByCustomerIdAsync(
      event.customerId
    );

    const updateAccountDetailPromises = accountDetails.map((ad) => {
      //
      const updatedAccountDetail = { ...ad, correspondenceAddress: customer.address };

      if (event.billingUpdateRequested) {
        updatedAccountDetail.billingAddress = customer.address;
      }

      return this.accountDetailsStore.updateAccountDetailAsync(updatedAccountDetail);
    });

    const updateAccountDetailResults = await Promise.allSettled(updateAccountDetailPromises);

    if (updateAccountDetailResults.some((r) => r.status === 'rejected')) {
      throw new Error(
        `One or more account detail updates were not processed successfully: ${JSON.stringify({
          event,
        })}`
      );
    }
  }
}

export const ENV_VAR_CUSTOMER_TABLE_NAME = 'CUSTOMER_TABLE_NAME';
export const ENV_VAR_ACCOUNT_DETAIL_TABLE_NAME = 'ACCOUNT_DETAIL_TABLE_NAME';

const accountUpdaterFunction = new AccountUpdaterFunction(
  new CustomerStore(process.env[ENV_VAR_CUSTOMER_TABLE_NAME] ?? '<undefined>'),
  new AccountDetailStore(process.env[ENV_VAR_ACCOUNT_DETAIL_TABLE_NAME] ?? '<undefined>')
);

export const handler = async (event: SNSEvent): Promise<void> => {
  //
  const accountUpdaterFunctionPromises = event.Records.map((r) => {
    const customerUpdatedEvent = JSON.parse(r.Sns.Message) as CustomerUpdatedEvent;
    return accountUpdaterFunction.handleAsync(customerUpdatedEvent);
  });

  const accountUpdaterFunctionResults = await Promise.allSettled(accountUpdaterFunctionPromises);

  if (accountUpdaterFunctionResults.some((r) => r.status === 'rejected')) {
    throw new Error(
      `One or more records were not successfully processed: ${JSON.stringify({ event })}`
    );
  }
};
