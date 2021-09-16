/* eslint-disable no-restricted-syntax */
/* eslint-disable class-methods-use-this */
import { SNSEvent } from 'aws-lambda/trigger/sns';
import { nanoid } from 'nanoid';
import { LambdaInvokeResponse } from './exchanges/LambdaInvokeExchange';
import { ListExecutionRequest, ListExecutionResponse } from './exchanges/ListExecutionExchange';
import { StartExecutionRequest, StartExecutionResponse } from './exchanges/StartExecutionExchange';
import ExecutionRepository, { ExecutionSummary, ExecutionStatus } from './ExecutionRepository';
import OrchestrationDefinition from './OrchestrationDefinition';

const executionRepository = new ExecutionRepository();

export default abstract class OrchestratorHandler<TInput, TOutput, TData> {
  //
  constructor(public definition: OrchestrationDefinition<TInput, TOutput, TData>) {}

  // eslint-disable-next-line class-methods-use-this
  async handleAsync(
    event: StartExecutionRequest | ListExecutionRequest | SNSEvent
  ): Promise<StartExecutionResponse | ListExecutionResponse | void> {
    //
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ event }, null, 2));

    // TODO 12Sep21: Raise an event on completion with the output? No, keep behaviour like Step Functions

    if ('isStartExecutionResponse' in event) {
      return this.handleStartExecutionAsync(event);
    }

    if ('isListExecutionResponse' in event) {
      return this.handleListExecutionAsync(event);
    }

    if ('Records' in event) {
      return this.handleResumeExecutionAsync(event);
    }

    throw new Error(`Unhandled event type`);
  }

  private async handleStartExecutionAsync(
    request: StartExecutionRequest
  ): Promise<StartExecutionResponse> {
    //
    const executionId = nanoid();

    const initialExecutionSummary: ExecutionSummary = {
      startTime: Date.now(),
      status: ExecutionStatus.Running,
    };

    await executionRepository.putExecutionSummaryAsync(executionId, initialExecutionSummary);

    const data = this.definition.getData((request.input ?? {}) as TInput);

    await executionRepository.putExecutionStateAsync(executionId, {
      messageCount: 0,
      data,
    });

    // TODO 13Sep21: Run the orchestration from the start as far as it will go

    const finalExecutionSummary: ExecutionSummary = {
      ...initialExecutionSummary,
      endTime: Date.now(),
      status: ExecutionStatus.Completed,
    };

    await executionRepository.putExecutionSummaryAsync(executionId, finalExecutionSummary);

    return {
      isStartExecutionResponse: null,
      executionId,
    };
  }

  private async handleListExecutionAsync(
    request: ListExecutionRequest
  ): Promise<ListExecutionResponse> {
    //
    const executionSummary = await executionRepository.getExecutionSummaryAsync(
      request.executionId
    );

    return {
      isListExecutionResponse: null,
      executionSummary,
    };
  }

  async handleResumeExecutionAsync(event: SNSEvent): Promise<void> {
    //
    const lambdaInvokeResponses = event.Records.map(
      (r) => JSON.parse(r.Sns.Message) as LambdaInvokeResponse
    );

    // TODO 16Sep21: Handle in parallel?

    for await (const lambdaInvokeResponse of lambdaInvokeResponses) {
      try {
        await this.handleLambdaInvokeResponseAsync(lambdaInvokeResponse);
      } catch (error) {
        // TODO 13Sep21: Prevent one orchestration from bringing down another
      }
    }
  }

  async handleLambdaInvokeResponseAsync(response: LambdaInvokeResponse): Promise<void> {
    //
    // const message = await executionRepository.retrieveExecutionMessageAsync(
    //   response.executionId,
    //   response.messageId
    // );
    // const data = await executionRepository.retrieveExecutionStateAsync(response.executionId);
    // const responsePayload = response.payload ?? {};
    // TODO 13Sep21: Resume the flow
    // TODO 13Sep21: If it got to the end then do the 'on completion' steps, e.g. delete data and update state
  }
}
