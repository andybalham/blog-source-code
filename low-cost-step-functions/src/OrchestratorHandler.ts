/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
/* eslint-disable class-methods-use-this */
import { SNSEvent } from 'aws-lambda/trigger/sns';
import { nanoid } from 'nanoid';
import { LambdaInvokeResponse } from './exchanges/LambdaInvokeExchange';
import { ListExecutionRequest, ListExecutionResponse } from './exchanges/ListExecutionExchange';
import { StartExecutionRequest, StartExecutionResponse } from './exchanges/StartExecutionExchange';
import ExecutionRepository, { ExecutionState, ExecutionStatus } from './ExecutionRepository';
import { Orchestration } from './OrchestrationBuilder';

const executionRepository = new ExecutionRepository();

export default abstract class OrchestratorHandler<TInput, TOutput, TData> {
  //
  constructor(public orchestration: Orchestration<TInput, TOutput, TData>) {}

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

    const data = this.orchestration.getData((request.input ?? {}) as TInput);

    const initialExecutionState: ExecutionState = {
      startTime: Date.now(),
      status: ExecutionStatus.Running,
      messageCount: 0,
      data,
    };

    await executionRepository.putExecutionStateAsync(executionId, initialExecutionState);

    // TODO 13Sep21: Run the orchestration from the start as far as it will go

    for await (const step of this.orchestration.steps) {
      if ('isLambdaInvoke' in step) {
        const stepRequest = step.getRequest(data);
        console.log(`${JSON.stringify({ step })}: ${JSON.stringify({ stepRequest })}`);
        // TODO 18Sep21: Instead of invoking directly, invoke via SNS
        const stepHandler = new step.HandlerType();
        const stepResponse = await stepHandler.handleRequestAsync(stepRequest);
        console.log(`${JSON.stringify({ step })}: ${JSON.stringify({ stepResponse })}`);
        step.updateData(data, stepResponse);
      } else {
        throw new Error(`Unhandled step type: ${JSON.stringify(step)}`);
      }
    }

    const output = this.orchestration.getOutput ? this.orchestration.getOutput(data) : undefined;

    const finalExecutionState: ExecutionState = {
      ...initialExecutionState,
      endTime: Date.now(),
      status: ExecutionStatus.Completed,
      output,
    };

    await executionRepository.putExecutionStateAsync(executionId, finalExecutionState);

    return {
      executionId,
    };
  }

  private async handleListExecutionAsync(
    request: ListExecutionRequest
  ): Promise<ListExecutionResponse> {
    //
    const executionState = await executionRepository.getExecutionStateAsync(request.executionId);

    if (executionState === undefined) {
      return {};
    }

    return {
      status: executionState.status,
      startTime: executionState.startTime,
      endTime: executionState.endTime,
      output: executionState.output,
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
      } catch (error: any) {
        // TODO 13Sep21: Prevent one orchestration from bringing down another
        // eslint-disable-next-line no-console
        console.error(
          `${error.stack}\n\nError handling response: ${JSON.stringify(lambdaInvokeResponse)}`
        );
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
