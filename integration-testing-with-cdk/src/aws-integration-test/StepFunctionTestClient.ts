/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/no-extraneous-dependencies */
import AWS from 'aws-sdk';
import {
  ExecutionStatus,
  HistoryEvent,
  StartExecutionInput,
  StartExecutionOutput,
} from 'aws-sdk/clients/stepfunctions';

const STEP_FUNCTION_STATE_RUNNING = 'RUNNING';

export default class StepFunctionClient {
  //
  private readonly stepFunctions: AWS.StepFunctions;

  executionArn: string;

  constructor(private region: string, private stateMachineArn: string) {
    this.stepFunctions = new AWS.StepFunctions({ region });
  }

  async startExecutionAsync(input: Record<string, any>): Promise<void> {
    //
    if (this.executionArn !== undefined) throw new Error('this.executionArn !== undefined');

    const params: StartExecutionInput = {
      stateMachineArn: this.stateMachineArn,
      input: JSON.stringify(input),
    };

    const { executionArn } = await this.stepFunctions.startExecution(params).promise();

    this.executionArn = executionArn;
  }

  async isExecutionFinishedAsync(): Promise<boolean> {
    //
    if (this.executionArn === undefined) throw new Error('this.executionArn === undefined');

    const opts = {
      maxResults: 1,
      stateMachineArn: this.stateMachineArn,
    };

    const result = await this.stepFunctions.listExecutions(opts).promise();

    const { executions } = result;

    const isExecutionFinished =
      executions &&
      executions[0] &&
      executions[0].executionArn === this.executionArn &&
      executions[0].status !== STEP_FUNCTION_STATE_RUNNING;

    return isExecutionFinished;
  }

  async getStatusAsync(): Promise<ExecutionStatus | undefined> {
    //
    if (this.executionArn === undefined) throw new Error('this.executionArn === undefined');

    const opts = {
      maxResults: 1,
      stateMachineArn: this.stateMachineArn,
    };

    const result = await this.stepFunctions.listExecutions(opts).promise();

    const { executions } = result;

    if (executions && executions[0] && executions[0].executionArn === this.executionArn) {
      return executions[0].status;
    }

    return undefined;
  }

  async getLastEventAsync(): Promise<HistoryEvent | undefined> {
    //
    if (this.executionArn === undefined) throw new Error('this.executionArn === undefined');

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return getLastEventAsync(this.region, this.stateMachineArn, this.executionArn);
  }
}

// TODO 15Jul21: Tidy up this code VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV

const getExecutionsAsync = async (
  region: string,
  stateMachineArn: string,
  statusFilter?: string
) => {
  const stepFunctions = new AWS.StepFunctions({ region });
  const opts = {
    maxResults: 1,
    stateMachineArn,
    ...(statusFilter && { statusFilter }),
  };
  const result = await stepFunctions.listExecutions(opts).promise();

  const { executions } = result;

  return executions;
};

export const getEventName = (event: AWS.StepFunctions.HistoryEvent) => {
  //
  const { name } = event.stateEnteredEventDetails ||
    event.stateExitedEventDetails || {
    name: undefined,
  };

  return name;
};

export const getLastEventAsync = async (
  region: string,
  stateMachineArn: string,
  executionArn: string
): Promise<HistoryEvent | undefined> => {
  //
  const executions = (await getExecutionsAsync(region, stateMachineArn)).filter(
    (e) => e.executionArn === executionArn
  );

  if (executions.length > 0) {
    //
    const stepFunctions = new AWS.StepFunctions({ region });

    const { events } = await stepFunctions
      .getExecutionHistory({ executionArn, reverseOrder: true, maxResults: 1 })
      .promise();

    if (events.length > 0) {
      return events[0];
    }

    return undefined;
  }

  return undefined;
};

export const getCurrentStateAsync = async (region: string, stateMachineArn: string) => {
  const executions = await getExecutionsAsync(region, stateMachineArn, STEP_FUNCTION_STATE_RUNNING);
  if (executions.length > 0) {
    const newestRunning = executions[0]; // the first is the newest one

    const stepFunctions = new AWS.StepFunctions({ region });
    const { executionArn } = newestRunning;
    const { events } = await stepFunctions
      .getExecutionHistory({ executionArn, reverseOrder: true, maxResults: 1 })
      .promise();
    if (events.length > 0) {
      const newestEvent = events[0];
      const name = getEventName(newestEvent);
      return name;
    }
    return undefined;
  }
  return undefined;
};

export const getStates = async (region: string, stateMachineArn: string) => {
  const executions = await getExecutionsAsync(region, stateMachineArn);
  if (executions.length > 0) {
    const newestRunning = executions[0]; // the first is the newest one

    const stepFunctions = new AWS.StepFunctions({ region });
    const { executionArn } = newestRunning;
    const { events } = await stepFunctions
      .getExecutionHistory({ executionArn, reverseOrder: true })
      .promise();
    const names = events.map((event) => getEventName(event)).filter((name) => !!name);
    return names;
  }
  return [];
};

export const stopRunningExecutions = async (region: string, stateMachineArn: string) => {
  const stepFunctions = new AWS.StepFunctions({ region });
  const executions = await getExecutionsAsync(region, stateMachineArn, STEP_FUNCTION_STATE_RUNNING);

  await Promise.all(
    executions.map(({ executionArn }) => stepFunctions.stopExecution({ executionArn }).promise())
  );
};
