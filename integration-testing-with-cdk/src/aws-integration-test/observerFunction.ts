/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { ObserverOutput } from './ObserverOutput';
import TestFunctionClient from './TestFunctionClient';

const observerId = process.env.OBSERVER_ID ?? 'undefined';

const lambdaTestClient = new TestFunctionClient();

export const handler = async (event: Record<string, any>): Promise<void> => {
  //
  console.log(JSON.stringify(event));

  const output: ObserverOutput<Record<string, any>> = {
    observerId,
    timestamp: Date.now(),
    event,
  };

  await lambdaTestClient.setTestOutputAsync(output);
};
