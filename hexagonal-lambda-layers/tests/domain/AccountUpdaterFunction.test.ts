/* eslint-disable no-console */
/* eslint-disable import/extensions, import/no-absolute-path */
import AccountUpdaterFunction from '../../src/domain-functions/AccountUpdaterFunction';
import {
  Customer,
  ICustomerStore,
  IAccountDetailStore,
  AccountDetail,
} from '../../src/domain-contracts';

describe('AccountUpdaterFunction Test Suite', () => {
  //
  let customerStoreMock: ICustomerStore;
  let accountDetailStoreMock: IAccountDetailStore;

  const testCustomerId = 'TestCustomerId';

  const testCustomer: Customer = {
    "customerId": testCustomerId,
    "name": 'Test Customer',
    "address": {
      "lines": ['Line1', 'Line2'],
      "postalCode": 'PostalCode',
    },
  };

  beforeEach(() => {
    customerStoreMock = {
      retrieveCustomerAsync: jest.fn(),
    };

    accountDetailStoreMock = {
      listAccountDetailsByCustomerIdAsync: jest.fn(),
      updateAccountDetailAsync: jest.fn(),
    };
  });

  it('handles no accounts', async () => {
    //
    // Arrange

    customerStoreMock.retrieveCustomerAsync = jest.fn().mockResolvedValue(testCustomer);
    accountDetailStoreMock.listAccountDetailsByCustomerIdAsync = jest.fn().mockResolvedValue([]);

    const accountUpdaterFunction = new AccountUpdaterFunction(
      customerStoreMock,
      accountDetailStoreMock
    );

    // Act

    await accountUpdaterFunction.handleAsync({
      customerId: testCustomerId,
      billingUpdateRequested: false,
    });

    // Assert

    expect(customerStoreMock.retrieveCustomerAsync).toBeCalledWith(testCustomerId);

    expect(accountDetailStoreMock.listAccountDetailsByCustomerIdAsync).toBeCalledWith(
      testCustomerId
    );

    expect(accountDetailStoreMock.updateAccountDetailAsync).toBeCalledTimes(0);
  });

  it('handles single account no billing update requested', async () => {
    //
    // Arrange

    const accountDetail: AccountDetail = {
      accountDetailId: 'TestAccountId',
      customerId: testCustomerId,
      correspondenceAddress: {
        lines: ['CorrespondenceLine1', 'CorrespondenceLine2'],
        postalCode: 'CorrespondencePostalCode',
      },
      billingAddress: {
        lines: ['BillingLine1', 'BillingLine2'],
        postalCode: 'BillingPostalCode',
      },
    };

    customerStoreMock.retrieveCustomerAsync = jest.fn().mockResolvedValue(testCustomer);
    accountDetailStoreMock.listAccountDetailsByCustomerIdAsync = jest
      .fn()
      .mockResolvedValue([accountDetail]);

    const updateAccountDetailMock = jest.fn();
    accountDetailStoreMock.updateAccountDetailAsync = updateAccountDetailMock;

    const accountUpdaterFunction = new AccountUpdaterFunction(
      customerStoreMock,
      accountDetailStoreMock
    );

    // Act

    await accountUpdaterFunction.handleAsync({
      customerId: testCustomerId,
      billingUpdateRequested: false,
    });

    // Assert

    expect(customerStoreMock.retrieveCustomerAsync).toBeCalledWith(testCustomerId);

    expect(accountDetailStoreMock.listAccountDetailsByCustomerIdAsync).toBeCalledWith(
      testCustomerId
    );

    expect(accountDetailStoreMock.updateAccountDetailAsync).toBeCalledTimes(1);

    const { calls: updateAccountDetailCalls } = updateAccountDetailMock.mock;
    const actualUpdatedAccountDetail = updateAccountDetailCalls[0][0];

    expect(actualUpdatedAccountDetail.correspondenceAddress).toEqual(testCustomer.address);
    expect(actualUpdatedAccountDetail.billingAddress).toEqual(accountDetail.billingAddress);
  });
});
