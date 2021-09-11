/* eslint-disable class-methods-use-this */
import { LambdaTaskHandler } from '../../src';

export interface AddTwoNumbersRequest {
  value1: number;
  value2: number;
}

export interface AddTwoNumbersResponse {
  total: number;
}

class AddTwoNumbersTaskHandler extends LambdaTaskHandler<
  AddTwoNumbersRequest,
  AddTwoNumbersResponse
> {
  async handleRequestAsync(
    request?: AddTwoNumbersRequest
  ): Promise<AddTwoNumbersResponse | undefined> {
    if (request === undefined) throw new Error('request === undefined');

    const response: AddTwoNumbersResponse = {
      total: request.value1 + request.value2,
    };

    return response;
  }
}

// TODO 11Sep21: Could we make this more functional?

const addTwoNumbersTaskHandler = new AddTwoNumbersTaskHandler();

export const handler = async (event: any): Promise<any> =>
  addTwoNumbersTaskHandler.handleAsync(event);
