/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
import { IntegrationTestClient, StepFunctionsTestClient } from '@andybalham/sls-testing-toolkit';
import { nanoid } from 'nanoid';
import LoanProcessorTestStack from '../lib/LoanProcessorTestStack';

describe('LoanProcessor Test Suite', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: LoanProcessorTestStack.StackId,
    deleteLogs: true,
  });

  let loanProcessorStateMachine: StepFunctionsTestClient;

  before(async () => {
    await testClient.initialiseClientAsync();
    loanProcessorStateMachine = testClient.getStepFunctionsTestClient(
      LoanProcessorTestStack.StateMachineId
    );
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
  });

  it.only('invoke state machine once', async () => {
    const response = await loanProcessorStateMachine.startExecutionAsync({
      correlationId: nanoid(),
      firstName: 'Trevor',
      lastName: 'Potato',
      postcode: 'MK3 9SE',
    });

    console.log(JSON.stringify({ response }, null, 2));
  }).timeout(10 * 1000);

  it.skip('invoke state machine 10 times', async () => {
    for (let i = 0; i < 10; i++) {
      const response = await loanProcessorStateMachine.startExecutionAsync({
        correlationId: nanoid(),
        firstName: 'Trevor',
        lastName: 'Potato',
        postcode: 'MK3 9SE',
      });

      console.log(JSON.stringify({ response }, null, 2));
    }
  }).timeout(30 * 1000);
  /*
  [{ minuteCount: 12, minIntervalSeconds: 1, maxIntervalSeconds: 6 }].forEach((theory) => {
    it.only(`Invoke state machine for ${JSON.stringify(theory)}`, async () => {
      //
      const endTime = Date.now() + 1000 * 60 * theory.minuteCount;

      while (Date.now() < endTime) {
        //
        const response = await loanProcessorStateMachine.invokeAsync<
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
*/
});
