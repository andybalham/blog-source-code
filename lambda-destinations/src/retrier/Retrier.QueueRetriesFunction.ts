/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/prefer-default-export */
import { SQSEvent } from 'aws-lambda/trigger/sqs';
import SQS, { SendMessageRequest } from 'aws-sdk/clients/sqs';
import { RetriableState } from './RetriableState';

export const RETRY_QUEUE_URL_ENV_VAR = 'RETRY_QUEUE_URL';
export const MAX_RETRY_COUNT_ENV_VAR = 'MAX_RETRY_COUNT';

const queueUrl = process.env[RETRY_QUEUE_URL_ENV_VAR];
const maxRetryCount = parseInt(process.env[MAX_RETRY_COUNT_ENV_VAR] ?? '0', 10);

const sqs = new SQS();

export const handler = async (failureEvent: SQSEvent): Promise<void> => {
  //
  console.log(JSON.stringify({ failureEvent }, null, 2));

  if (failureEvent.Records.length > 1) {
    console.error(`failureEvent.Records.length > 1: ${failureEvent.Records.length}`);
    return;
  }

  const failureEventBody = JSON.parse(failureEvent.Records[0].body);

  console.log(
    JSON.stringify(
      {
        requestContext: failureEventBody.requestContext,
        responsePayload: failureEventBody.responsePayload,
      },
      null,
      2
    )
  );

  const retriableState = failureEventBody.requestPayload as RetriableState;

  if (retriableState.retryCount >= maxRetryCount) {
    console.error(
      `Maximum retry count exceeded: ${JSON.stringify({
        maxRetryCount,
        retryCount: retriableState.retryCount,
        correlationId: retriableState.correlationId,
      })}`
    );
    return;
  }
  retriableState.retryCount += 1;

  if (queueUrl === undefined) throw new Error('queueUrl === undefined');

  const sendMessageRequest: SendMessageRequest = {
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(retriableState),
  };

  const sendMessageResult = await sqs.sendMessage(sendMessageRequest).promise();

  console.log(JSON.stringify({ sendMessageResult }, null, 2));
};
