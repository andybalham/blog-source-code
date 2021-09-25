/* eslint-disable class-methods-use-this */
import { AsyncTaskHandler } from '../../src';

export interface AddTwoNumbersRequest {
  value1: number;
  value2: number;
}

export interface AddTwoNumbersResponse {
  total: number;
}

export class AddTwoNumbersHandler extends AsyncTaskHandler<
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
  new AddTwoNumbersHandler().handleAsync(event);
