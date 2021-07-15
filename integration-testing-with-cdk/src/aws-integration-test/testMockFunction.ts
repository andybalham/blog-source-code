/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { TestMockFunctionClient } from '.';

const lambdaTestClient = new TestMockFunctionClient(process.env.INTEGRATION_TEST_TABLE_NAME);

const mockId = process.env.MOCK_ID;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const handler = async (request: any): Promise<void> => {
  //
  console.log(JSON.stringify({ request }, null, 2));

  if (mockId === undefined) throw new Error('mockId === undefined');

  const { inputs } = await lambdaTestClient.getCurrentTestAsync();

  if (inputs === undefined) throw new Error('inputs === undefined');

  const state = await lambdaTestClient.getMockStateAsync<{ invocationCount: number }>(mockId, {
    invocationCount: 0,
  });

  const mockExchanges = (inputs as any).mocks[mockId];

  if (mockExchanges === undefined) {
    throw new Error(`No mock exchanges found for mockId: ${mockId}`);
  }

  const { response } = mockExchanges[state.invocationCount];

  state.invocationCount += 1;

  await lambdaTestClient.setMockStateAsync(mockId, state);

  console.log(JSON.stringify({ response }, null, 2));

  return response;
};
