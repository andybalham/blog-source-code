/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/prefer-default-export */
import { SQSEvent } from 'aws-lambda/trigger/sqs';
import { Lambda } from 'aws-sdk';

export const INPUT_FUNCTION_NAME_ENV_VAR = 'INPUT_FUNCTION_NAME_ENV';

const inputFunctionName = process.env[INPUT_FUNCTION_NAME_ENV_VAR];

const lambda = new Lambda();

export const handler = async (retryEvent: SQSEvent): Promise<void> => {
  //
  console.log(JSON.stringify({ retryEvent }, null, 2));

  if (retryEvent.Records.length > 1) {
    console.error(`retryEvent.Records.length > 1: ${retryEvent.Records.length}`);
    return;
  }

  if (inputFunctionName === undefined) throw new Error('inputFunctionName === undefined');

  const params = {
    FunctionName: inputFunctionName,
    InvokeArgs: retryEvent.Records[0].body,
  };

  const invokeAsyncResponse = await lambda.invokeAsync(params).promise();

  console.log(JSON.stringify({ invokeAsyncResponse }, null, 2));
};
