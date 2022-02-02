/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/prefer-default-export */
import { APIGatewayEvent } from 'aws-lambda';
import { CreditReferenceRating, CreditReferenceResponse } from '../contracts/credit-reference';

export const handler = async (event: APIGatewayEvent): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));
  console.log(JSON.stringify({ body: event.body }, null, 2));

  const response: CreditReferenceResponse = {
    reference: 'CR1234',
    rating: CreditReferenceRating.Ugly,
  };

  return {
    body: JSON.stringify(response),
    statusCode: 200,
  };
};
