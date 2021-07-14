/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { LambdaTestClient } from '.';

const lambdaTestClient = new LambdaTestClient(process.env.INTEGRATION_TEST_TABLE_NAME);

const mockId = process.env.MOCK_ID;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const handler = async (request: any): Promise<void> => {
  //
  console.log(JSON.stringify(request));

  if (mockId === undefined) throw new Error('mockId === undefined');

  const { inputs } = await lambdaTestClient.getCurrentTestAsync();

  if (inputs === undefined) throw new Error('inputs === undefined');

  const state = await lambdaTestClient.getMockStateAsync<{ invocationCount: number }>(mockId, {
    invocationCount: 0,
  });

  const { response } = (inputs as any).mocks[mockId][state.invocationCount];

  state.invocationCount += 1;

  await lambdaTestClient.setTestOutputAsync({
    mockId,
    invocation: state.invocationCount,
    request,
    response,
  });

  return response;
};
