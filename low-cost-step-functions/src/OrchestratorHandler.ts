/* eslint-disable no-param-reassign */
/* eslint-disable consistent-return */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
/* eslint-disable class-methods-use-this */
import { SNSEvent } from 'aws-lambda/trigger/sns';
import SNS, { PublishInput } from 'aws-sdk/clients/sns';
import { nanoid } from 'nanoid';
import AsyncTask from './AsyncTask';
import { AsyncTaskRequest, AsyncTaskResponse } from './exchanges/AsyncTaskExchange';
import { ListExecutionRequest, ListExecutionResponse } from './exchanges/ListExecutionExchange';
import { StartExecutionRequest, StartExecutionResponse } from './exchanges/StartExecutionExchange';
import ExecutionRepository, { ExecutionState, ExecutionStatus } from './ExecutionRepository';
import {
  ChoiceOrchestrationStep,
  Orchestration,
  TaskOrchestrationStep,
} from './OrchestrationBuilder';

const executionRepository = new ExecutionRepository();

const sns = new SNS();

export default abstract class OrchestratorHandler<TInput, TOutput, TData> {
  //
  static readonly MaxMessageCount = 1000;

  constructor(public orchestration: Orchestration<TInput, TOutput, TData>) {}

  async handleAsync(
    event: StartExecutionRequest | ListExecutionRequest | SNSEvent
  ): Promise<StartExecutionResponse | ListExecutionResponse | void> {
    try {
      //
      console.log(JSON.stringify({ event }, null, 2));

      // TODO 12Sep21: Raise an event on completion with the output? No, keep behaviour like Step Functions

      if ('isStartExecutionResponse' in event) {
        return await this.handleStartExecutionAsync(event);
      }

      if ('isListExecutionResponse' in event) {
        return await this.handleListExecutionAsync(event);
      }

      if ('Records' in event) {
        return await this.handleResumeExecutionAsync(event);
      }

      throw new Error(`Unhandled event type`);
      //
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error(`${error.stack}\n\nError handling event: ${JSON.stringify(event)}`);
    }
  }

  private async handleStartExecutionAsync(
    request: StartExecutionRequest
  ): Promise<StartExecutionResponse> {
    //
    const executionId = nanoid();

    const data = this.orchestration.getData((request.input ?? {}) as TInput);

    const initialExecutionState: ExecutionState<TData> = {
      startTime: Date.now(),
      status: ExecutionStatus.Running,
      messageCount: 0,
      data,
    };

    await executionRepository.putExecutionStateAsync(executionId, initialExecutionState);

    if (this.orchestration.steps.length > 0) {
      //
      await this.executeFromStepAsync(executionId, initialExecutionState, 0);
      //
    } else {
      //
      // No steps mean we have nothing to do

      const output = this.orchestration.getOutput ? this.orchestration.getOutput(data) : undefined;

      const finalExecutionState: ExecutionState<TData> = {
        ...initialExecutionState,
        endTime: Date.now(),
        status: ExecutionStatus.Succeeded,
        output,
      };

      await executionRepository.putExecutionStateAsync(executionId, finalExecutionState);
    }

    return {
      executionId,
    };
  }

  private async executeFromStepAsync(
    executionId: string,
    executionState: ExecutionState<TData>,
    initialStepIndex: number
  ): Promise<void> {
    //
    console.log(JSON.stringify({ initialState: executionState.data }, null, 2));

    let stepIndex = initialStepIndex;

    const isExecutionRunning = (): boolean =>
      stepIndex < this.orchestration.steps.length && stepIndex !== -1;

    let failSafeStepCount = 0; // Prevent accidental infinite loops
    const maxFailSafeStepCount = 1000;

    while (isExecutionRunning()) {
      //
      const step = this.orchestration.steps[stepIndex];

      console.log(JSON.stringify({ step }, null, 2));

      // TODO 20Sep21: Error handling

      if ('isAsyncTask' in step) {
        await this.executeAsyncTaskAsync(executionId, step, executionState.data);
        break;
      }

      if ('isChoice' in step) {
        stepIndex = this.getChoiceStepIndex(step, executionState.data);
      } else if ('isNext' in step) {
        stepIndex = this.getStepIndex(step.stepId);
      } else if ('isSucceed' in step) {
        executionState.status = ExecutionStatus.Succeeded;
        stepIndex = -1;
      } else if ('isFail' in step) {
        executionState.status = ExecutionStatus.Failed;
        stepIndex = -1;
      } else if ('isSyncTask' in step) {
        await this.executeSyncTaskAsync(step, executionState.data);
        stepIndex += 1;
      } else {
        throw new Error(`Unhandled step type: ${JSON.stringify(step)}`);
      }

      failSafeStepCount += 1;

      if (failSafeStepCount > maxFailSafeStepCount) {
        throw new Error(`Max fail safe step count has been reached: ${maxFailSafeStepCount}`);
      }
    }

    if (isExecutionRunning()) {
      //
      const suspendedExecutionState: ExecutionState<TData> = {
        ...executionState,
        messageCount: executionState.messageCount + 1,
      };

      await executionRepository.putExecutionStateAsync(executionId, suspendedExecutionState);

      console.log(JSON.stringify({ suspendedExecutionState }, null, 2));
      //
    } else {
      //
      const output = this.orchestration.getOutput
        ? this.orchestration.getOutput(executionState.data)
        : undefined;

      const finalExecutionState: ExecutionState<TData> = {
        ...executionState,
        endTime: Date.now(),
        status:
          executionState.status === ExecutionStatus.Running
            ? ExecutionStatus.Succeeded
            : executionState.status,
        output,
      };

      await executionRepository.putExecutionStateAsync(executionId, finalExecutionState);

      console.log(JSON.stringify({ finalExecutionState }, null, 2));
    }
  }

  private getChoiceStepIndex(step: ChoiceOrchestrationStep<TData>, data: TData): number {
    //
    const choice = step.choices.find((c) => c.when(data));

    const nextStepId = choice ? choice.next : step.otherwise;

    const nextStepIndex = this.getStepIndex(nextStepId);

    return nextStepIndex;
  }

  private async executeSyncTaskAsync(
    step: TaskOrchestrationStep<any, any, any>,
    data: any
  ): Promise<void> {
    const stepRequest = step.getRequest(data);
    const stepHandler = new step.HandlerType();
    const stepResponse = await stepHandler.handleRequestAsync(stepRequest);
    if (step.updateData) step.updateData(data, stepResponse);
  }

  private async executeAsyncTaskAsync(
    executionId: string,
    step: TaskOrchestrationStep<any, any, any>,
    data: any
  ): Promise<void> {
    //
    const stepRequest = step.getRequest(data);

    const messageId = nanoid();

    await executionRepository.putExecutionMessageAsync(executionId, {
      messageId,
      stepId: step.stepId,
      sentTime: Date.now(),
    });

    const asyncTaskRequest: AsyncTaskRequest = {
      isAsyncTaskRequest: null,
      executionId,
      messageId,
      payload: stepRequest,
    };

    const stepHandlerTypeName = step.HandlerType.name;
    const requestTopicArnEnvVarName = AsyncTask.getRequestTopicArnEnvVarName(step.HandlerType);
    const taskHandlerRequestTopicArn = process.env[requestTopicArnEnvVarName];

    if (taskHandlerRequestTopicArn === undefined)
      throw new Error(
        `taskHandlerRequestTopicArn === undefined (${JSON.stringify({
          stepHandlerTypeName,
          requestTopicArnEnvVarName,
        })})`
      );

    const requestPublishInput: PublishInput = {
      TopicArn: taskHandlerRequestTopicArn,
      Message: JSON.stringify(asyncTaskRequest),
    };

    console.log(JSON.stringify({ requestPublishInput }, null, 2));

    await sns.publish(requestPublishInput).promise();
  }

  private getStepIndex(stepId: string): number {
    //
    const stepIndex = this.orchestration.steps.findIndex((s) => s.stepId === stepId);

    if (stepIndex === -1) {
      throw new Error(`Unknown stepId: ${stepId}`);
    }

    return stepIndex;
  }

  private async handleListExecutionAsync(
    request: ListExecutionRequest
  ): Promise<ListExecutionResponse> {
    //
    const executionState = await executionRepository.getExecutionStateAsync(request.executionId);

    if (executionState === undefined) {
      return {};
    }

    const listExecutionResponse: ListExecutionResponse = {
      status: executionState.status,
      startTime: executionState.startTime,
      endTime: executionState.endTime,
      output: executionState.output,
    };

    console.log(JSON.stringify({ listExecutionResponse }, null, 2));

    return listExecutionResponse;
  }

  async handleResumeExecutionAsync(event: SNSEvent): Promise<void> {
    //
    const lambdaInvokeResponses = event.Records.map(
      (r) => JSON.parse(r.Sns.Message) as AsyncTaskResponse
    );

    // TODO 16Sep21: Handle in parallel?

    for await (const lambdaInvokeResponse of lambdaInvokeResponses) {
      try {
        await this.handleLambdaInvokeResponseAsync(lambdaInvokeResponse);
      } catch (error: any) {
        console.error(
          `${error.stack}\n\nError handling response: ${JSON.stringify(lambdaInvokeResponse)}`
        );
      }
    }
  }

  async handleLambdaInvokeResponseAsync(response: AsyncTaskResponse): Promise<void> {
    //
    console.log(JSON.stringify({ response }, null, 2));

    const executionState = await executionRepository.getExecutionStateAsync<TData>(
      response.executionId
    );

    if (executionState === undefined) {
      console.error(`No state found for: ${JSON.stringify(response)}`);
      return;
    }

    if (executionState.messageCount > OrchestratorHandler.MaxMessageCount) {
      console.error(`Max message cound exceeded: ${OrchestratorHandler.MaxMessageCount}`);
      return;
    }

    console.log(JSON.stringify({ executionState }, null, 2));

    const executionMessage = await executionRepository.getExecutionMessageAsync(
      response.executionId,
      response.messageId
    );

    if (executionMessage === undefined) {
      console.error(`No message found for: ${JSON.stringify(response)}`);
      return;
    }

    console.log(JSON.stringify({ executionMessage }, null, 2));

    await executionRepository.deleteExecutionMessageAsync(response.executionId, response.messageId);

    const resumeStepIndex = this.getStepIndex(executionMessage.stepId);

    const resumeStep = this.orchestration.steps[resumeStepIndex] as TaskOrchestrationStep<
      any,
      any,
      TData
    >;

    if (resumeStep.updateData) resumeStep.updateData(executionState.data, response.payload);

    const nextStepIndex = resumeStepIndex + 1;

    await this.executeFromStepAsync(response.executionId, executionState, nextStepIndex);
  }
}
