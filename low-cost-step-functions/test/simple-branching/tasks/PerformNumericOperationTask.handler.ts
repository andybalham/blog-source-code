/* eslint-disable class-methods-use-this */
import { AsyncTaskHandler } from '../../../src';

export enum NumericOperation {
  Add = 'Add',
  Subtract = 'Subtract',
}

export interface PerformNumericOperationRequest {
  operation: NumericOperation;
  value1: number;
  value2: number;
}

export interface PerformNumericOperationResponse {
  result: number;
}

export class PerformNumericOperationTaskHandler extends AsyncTaskHandler<
  PerformNumericOperationRequest,
  PerformNumericOperationResponse
> {
  async handleRequestAsync(
    request: PerformNumericOperationRequest
  ): Promise<PerformNumericOperationResponse> {
    //
    let result: number;

    switch (request.operation) {
      case NumericOperation.Add:
        result = request.value1 + request.value2;
        break;

      case NumericOperation.Subtract:
        result = request.value1 - request.value2;
        break;

      default:
        throw new Error(`Unhandled operation: ${request.operation}`);
    }

    return {
      result,
    };
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const handler = async (event: any): Promise<void> =>
  new PerformNumericOperationTaskHandler().handleAsync(event);
