/* eslint-disable class-methods-use-this */
import { AsyncTaskHandler } from '../../../src';

export enum NumericOperation {
  Add = 'Add',
  Subtract = 'Subtract',
}

export interface PublishResultRequest {
  summary: string;
}

export class PublishResultTaskHandler extends AsyncTaskHandler<PublishResultRequest, void> {
  async handleRequestAsync(request: PublishResultRequest): Promise<void> {
    //
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const handler = async (event: any): Promise<void> =>
  new PublishResultTaskHandler().handleAsync(event);
