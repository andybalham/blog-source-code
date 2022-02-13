/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
import { IntegrationTestClient, LambdaTestClient } from '@andybalham/sls-testing-toolkit';
import { nanoid } from 'nanoid';
import LoanProcessorTestStack from '../lib/LoanProcessorTestStack';
import { CreditReferenceRequest, CreditReferenceResponse } from '../src/contracts/credit-reference';

describe('LoanProcessor Test Suite', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: LoanProcessorTestStack.StackId,
    deleteLogs: true,
  });

  let creditReferenceProxyFunction: LambdaTestClient;

  let correlationId: string;

  function newRequest(): CreditReferenceRequest {
    return {
      correlationId,
      requestId: nanoid(),
      firstName: 'John',
      lastName: 'Power',
      postcode: '123',
    };
  }

  before(async () => {
    await testClient.initialiseClientAsync();
    creditReferenceProxyFunction = testClient.getLambdaTestClient(
      LoanProcessorTestStack.CreditReferenceProxyFunctionId
    );
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
    correlationId = nanoid();
  });

  it('invoke function once', async () => {
    const response = await creditReferenceProxyFunction.invokeAsync<
      CreditReferenceRequest,
      CreditReferenceResponse
    >(newRequest());

    console.log(JSON.stringify({ response }, null, 2));
  }).timeout(10 * 1000);

  it('invoke function 10 times', async () => {
    for (let i = 0; i < 10; i++) {
      const response = await creditReferenceProxyFunction.invokeAsync<
        CreditReferenceRequest,
        CreditReferenceResponse
      >(newRequest());

      console.log(JSON.stringify({ response }, null, 2));
    }
  }).timeout(30 * 1000);

  [{ minuteCount: 10, minIntervalSeconds: 6, maxIntervalSeconds: 12 }].forEach((theory) => {
    it.only(`Invoke function for ${JSON.stringify(theory)}`, async () => {
      //
      const endTime = Date.now() + 1000 * 60 * theory.minuteCount;

      while (Date.now() < endTime) {
        //
        const response = await creditReferenceProxyFunction.invokeAsync<
          CreditReferenceRequest,
          CreditReferenceResponse
        >(newRequest());

        console.log(JSON.stringify({ response }));

        const randomWaitSeconds =
          Math.ceil(Math.random() * (theory.maxIntervalSeconds - theory.minIntervalSeconds)) +
          theory.minIntervalSeconds;

        await IntegrationTestClient.sleepAsync(randomWaitSeconds);
      }
    }).timeout(1000 * 60 * (theory.minuteCount + 1));
  });
});
