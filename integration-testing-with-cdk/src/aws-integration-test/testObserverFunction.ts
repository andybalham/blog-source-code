/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { TestMockFunctionClient } from '.';

const lambdaTestClient = new TestMockFunctionClient(process.env.INTEGRATION_TEST_TABLE_NAME);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const handler = async (event: any): Promise<void> => {
  console.log(JSON.stringify(event));
  await lambdaTestClient.setTestOutputAsync(event);
};
