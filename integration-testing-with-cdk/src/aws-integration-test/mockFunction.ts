/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */

import TestFunctionClient from './TestFunctionClient';

const lambdaTestClient = new TestFunctionClient();

const mockId = process.env.MOCK_ID;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const handler = async (request: any): Promise<void> => {
  //
  console.log(JSON.stringify({ request }, null, 2));

  if (mockId === undefined) throw new Error('mockId === undefined');

  const { mocks } = await lambdaTestClient.getTestPropsAsync();

  if (mocks === undefined) throw new Error('inputs === undefined');

  const state = await lambdaTestClient.getMockStateAsync<{ invocationCount: number }>(mockId, {
    invocationCount: 0,
  });

  const mockExchanges = mocks[mockId];

  if (mockExchanges === undefined) {
    throw new Error(`No expected exchanges found for mockId: ${mockId}`);
  }

  if (state.invocationCount >= mockExchanges.length) {
    throw new Error(`Invocation count exceeded expected exchange count for mockId: ${mockId}`);
  }

  const { error, response } = mockExchanges[state.invocationCount];

  state.invocationCount += 1;

  await lambdaTestClient.setMockStateAsync(mockId, state);

  if (error) {
    throw new Error(error);
  }

  console.log(JSON.stringify({ response }, null, 2));

  return response;
};
