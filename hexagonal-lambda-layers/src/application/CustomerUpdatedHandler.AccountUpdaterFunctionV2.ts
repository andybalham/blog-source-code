/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/extensions, import/no-absolute-path */
import { SNSEvent } from 'aws-lambda';
import { AccountDetailStore, CustomerStore } from '../data-access';
import AccountUpdaterFunction from './domain-functions/AccountUpdaterFunction';
import { CustomerUpdatedEvent } from '../domain-contracts';

export const ENV_VAR_CUSTOMER_TABLE_NAME = 'CUSTOMER_TABLE_NAME';
export const ENV_VAR_ACCOUNT_DETAIL_TABLE_NAME = 'ACCOUNT_DETAIL_TABLE_NAME';

const accountUpdaterFunction = new AccountUpdaterFunction(
  new CustomerStore(process.env[ENV_VAR_CUSTOMER_TABLE_NAME]),
  new AccountDetailStore(process.env[ENV_VAR_ACCOUNT_DETAIL_TABLE_NAME])
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
