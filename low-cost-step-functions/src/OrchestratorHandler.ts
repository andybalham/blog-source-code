import { SNSEvent } from 'aws-lambda/trigger/sns';
import { nanoid } from 'nanoid';
import {
  ExecutionStatus,
  ListExecutionRequest,
  ListExecutionResponse,
} from './exchanges/ListExecutionExchange';
import { StartExecutionRequest, StartExecutionResponse } from './exchanges/StartExecutionExchange';
import OrchestrationDefinition from './OrchestrationDefinition';

export default abstract class OrchestratorHandler<TInput, TOutput, TData> {
  //
  readonly definition: OrchestrationDefinition<TInput, TOutput, TData>;

  constructor() {
    this.definition = this.getDefinition();
  }

  abstract getDefinition(): OrchestrationDefinition<TInput, TOutput, TData>;

  // eslint-disable-next-line class-methods-use-this
  async handleAsync(
    event: StartExecutionRequest | ListExecutionRequest | SNSEvent
  ): Promise<StartExecutionResponse | ListExecutionResponse | void> {
    //
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ event }, null, 2));

    // TODO 12Sep21: Raise an event on completion with the output

    if ('isStartExecutionResponse' in event) {
      return {
        isStartExecutionResponse: null,
        executionId: nanoid(),
      };
    }

    if ('isListExecutionResponse' in event) {
      return {
        isListExecutionResponse: null,
        status: ExecutionStatus.Completed,
        startDate: new Date('2021-09-11T12:13:00'),
      };
    }

    if ('Records' in event) {
      throw new Error(`Not implemented yet`);
    }

    throw new Error(`Unhandled event type`);
  }
}
