/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import TestObservation from './TestObservation';
import TestFunctionClient from './TestFunctionClient';

const observerId = process.env.OBSERVER_ID ?? 'undefined';

const lambdaTestClient = new TestFunctionClient();

export const handler = async (event: Record<string, any>): Promise<void> => {
  //
  console.log(JSON.stringify(event));

  const output: TestObservation = {
    observerId,
    timestamp: Date.now(),
    data: event,
  };

  await lambdaTestClient.recordObservationAsync(output);
};
