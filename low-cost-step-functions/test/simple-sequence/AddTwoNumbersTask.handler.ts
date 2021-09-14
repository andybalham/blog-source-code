/* eslint-disable class-methods-use-this */
import { LambdaTaskHandler } from '../../src';

export interface AddTwoNumbersRequest {
  value1: number;
  value2: number;
}

export interface AddTwoNumbersResponse {
  total: number;
}

export class AddTwoNumbersTaskHandler extends LambdaTaskHandler<
  AddTwoNumbersRequest,
  AddTwoNumbersResponse
> {
  async handleRequestAsync(request: AddTwoNumbersRequest): Promise<AddTwoNumbersResponse> {
    return {
      total: request.value1 + request.value2,
    };
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const handler = async (event: any): Promise<void> =>
  new AddTwoNumbersTaskHandler().handleAsync(event);
