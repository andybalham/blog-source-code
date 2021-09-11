import { nanoid } from 'nanoid';
import { LambdaInvokeResponse } from './exchanges/LambdaInvokeExchange';
import {
  ExecutionStatus,
  ListExecutionRequest,
  ListExecutionResponse,
} from './exchanges/ListExecutionExchange';
import { OrchestratorExchange } from './exchanges/OrchestratorExchange';
import { StartExecutionRequest, StartExecutionResponse } from './exchanges/StartExecutionExchange';

export default abstract class OrchestratorHandler {
  //
  // eslint-disable-next-line class-methods-use-this
  async handleAsync(
    event: StartExecutionRequest | ListExecutionRequest | LambdaInvokeResponse
  ): Promise<StartExecutionResponse | ListExecutionResponse> {
    //
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ event }, null, 2));

    if (OrchestratorExchange.StartExecution in event) {
      return {
        isStartExecutionResponse: null,
        executionId: nanoid(),
      };
    }

    if (OrchestratorExchange.ListExecution in event) {
      return {
        isListExecutionResponse: null,
        status: ExecutionStatus.Completed,
        startDate: new Date('2021-09-11T12:13:00'),
      };
    }

    if (OrchestratorExchange.LambdaInvokeResponse in event) {
      throw new Error(`Not implemented yet`);
    }

    throw new Error(`Unhandled event type`);
  }
}
