/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
import { IntegrationTestClient, LambdaTestClient } from '@andybalham/sls-testing-toolkit';
import LoanProcessorTestStack from '../lib/LoanProcessorTestStack';
import { CreditReferenceRequest, CreditReferenceResponse } from '../src/contracts/credit-reference';

describe('LoanProcessor Test Suite', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: LoanProcessorTestStack.StackId,
    deleteLogs: true,
  });

  let creditReferenceProxyFunction: LambdaTestClient;

  const request: CreditReferenceRequest = {
    firstName: 'John',
    lastName: 'Power',
    postcode: '123',
  };

  before(async () => {
    await testClient.initialiseClientAsync();
    creditReferenceProxyFunction = testClient.getLambdaTestClient(
      LoanProcessorTestStack.CreditReferenceProxyFunctionId
    );
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
  });

  it.skip('invoke function once', async () => {
    const response = await creditReferenceProxyFunction.invokeAsync<
      CreditReferenceRequest,
      CreditReferenceResponse
    >(request);

    console.log(JSON.stringify({ response }, null, 2));
  }).timeout(10 * 1000);

  it.skip('invoke function 10 times', async () => {
    for (let i = 0; i < 10; i++) {
      const response = await creditReferenceProxyFunction.invokeAsync<
        CreditReferenceRequest,
        CreditReferenceResponse
      >(request);

      console.log(JSON.stringify({ response }, null, 2));
    }
  }).timeout(30 * 1000);

  it.skip('invoke function 40 times', async () => {
    for (let i = 0; i < 40; i++) {
      const response = await creditReferenceProxyFunction.invokeAsync<
        CreditReferenceRequest,
        CreditReferenceResponse
      >(request);

      console.log(JSON.stringify({ response }, null, 2));
    }
  }).timeout(60 * 1000);;
});
