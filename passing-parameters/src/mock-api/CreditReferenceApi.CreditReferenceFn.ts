/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/prefer-default-export */
import { APIGatewayEvent } from 'aws-lambda';

export const handler = async (event: APIGatewayEvent): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  console.log(JSON.stringify({ body: event.body }, null, 2));

  // TODO 16Jan22: What do we want to do with this function?

  return {
    body: JSON.stringify([
      { todoId: 1, text: 'walk the dog 🐕' },
      { todoId: 2, text: 'cook dinner 🥗' },
    ]),
    statusCode: 200,
  };
};
