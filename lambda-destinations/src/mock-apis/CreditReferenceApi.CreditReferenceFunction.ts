/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/prefer-default-export */
import { APIGatewayEvent } from 'aws-lambda';
import { nanoid } from 'nanoid';
import {
  CreditReferenceRating,
  CreditReferenceRequest,
  CreditReferenceResponse,
} from '../contracts/credit-reference';

async function sleepAsync(seconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export const ERROR_PERCENTAGE_ENV_VAR = 'ERROR_PERCENTAGE';
export const MIN_DELAY_MILLIS_ENV_VAR = 'MIN_DELAY_MILLIS';

const errorPercentage = parseInt(process.env[ERROR_PERCENTAGE_ENV_VAR] ?? '0', 10);
const minDelayMillis = parseInt(process.env[MIN_DELAY_MILLIS_ENV_VAR] ?? '0', 10);

export const handler = async (event: APIGatewayEvent): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));
  console.log(JSON.stringify({ body: event.body }, null, 2));

  const isError = Math.random() * 100 < errorPercentage;

  if (isError) {
    return {
      body: JSON.stringify({ message: "It's all gone Pete Tong" }),
      statusCode: 500,
    };
  }

  const creditReferenceRequest: CreditReferenceRequest = event.body
    ? JSON.parse(event.body)
    : undefined;

  const delaySeconds = (Math.random() * 1000 + minDelayMillis) / 1000;

  await sleepAsync(delaySeconds);

  const randomRating = Math.floor(Math.random() * 6);

  const response: CreditReferenceResponse = {
    correlationId: creditReferenceRequest?.correlationId ?? '<undefined>',
    requestId: creditReferenceRequest?.requestId ?? '<undefined>',
    reference: `CR-${nanoid(6)}`,
    rating: [
      CreditReferenceRating.Good,
      CreditReferenceRating.Good,
      CreditReferenceRating.Good,
      CreditReferenceRating.Bad,
      CreditReferenceRating.Bad,
      CreditReferenceRating.Poor,
    ][randomRating],
  };

  return {
    body: JSON.stringify(response),
    statusCode: 200,
  };
};
