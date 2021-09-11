import { nanoid } from 'nanoid';
import { ExecutionStatus } from '.';
import { ListExecutionRequest, ListExecutionResponse } from './exchanges/ListExecutionExchange';
import { OrchestratorExchange } from './exchanges/OrchestratorExchange';
import { StartExecutionRequest, StartExecutionResponse } from './exchanges/StartExecutionExchange';

// eslint-disable-next-line import/prefer-default-export
export const handler = async (
  event: StartExecutionRequest | ListExecutionRequest
): Promise<StartExecutionResponse | ListExecutionResponse> => {
  //
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ event }, null, 2));

  if (OrchestratorExchange.StartExecution in event) {
    return {
      isStartExecution: null,
      executionId: nanoid(),
    };
  }

  if (OrchestratorExchange.ListExecution in event) {
    return {
      isListExecution: null,
      status: ExecutionStatus.Completed,
      startDate: new Date('2021-09-11T12:13:00'),
    };
  }

  throw new Error(`Unhandled event type`);
};
