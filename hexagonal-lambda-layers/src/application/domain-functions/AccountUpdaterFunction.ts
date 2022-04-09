/* eslint-disable import/extensions, import/no-absolute-path */
import { CustomerUpdatedEvent, IAccountDetailStore, ICustomerStore } from '../../domain-contracts';

export default class AccountUpdaterFunction {
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
