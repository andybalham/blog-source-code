/* eslint-disable class-methods-use-this */
export enum ExecutionStatus {
  Running = 'RUNNING',
  Completed = 'SUCCEEDED',
  Failed = 'FAILED',
}

export interface ExecutionState {
  status: ExecutionStatus;
  startDate: Date;
  stopDate?: Date;
  output?: Record<string, any>;
}

export interface ExecutionData {
  data: Record<string, any>;
}

export interface ExecutionMessage {
  sentDate: Date;
  stepId: string;
}

export default class ExecutionRepository {
  //
  async createExecutionStateAsync(
    executionId: string,
    executionState: ExecutionState
  ): Promise<void> {
    throw new Error(`Not implemented`);
  }

  async retrieveExecutionStateAsync(executionId: string): Promise<ExecutionState | undefined> {
    throw new Error(`Not implemented`);
  }

  async updateExecutionStateAsync(
    executionId: string,
    executionState: ExecutionState
  ): Promise<void> {
    throw new Error(`Not implemented`);
  }

  async deleteExecutionStateAsync(executionId: string): Promise<void> {
    throw new Error(`Not implemented`);
  }

  async createExecutionDataAsync(executionId: string, executionData: ExecutionData): Promise<void> {
    throw new Error(`Not implemented`);
  }

  async retrieveExecutionDataAsync(executionId: string): Promise<ExecutionData> {
    throw new Error(`Not implemented`);
  }

  async updateExecutionDataAsync(executionId: string, executionData: ExecutionData): Promise<void> {
    throw new Error(`Not implemented`);
  }

  async deleteExecutionDataAsync(executionId: string): Promise<void> {
    throw new Error(`Not implemented`);
  }

  async createExecutionMessageAsync(
    executionId: string,
    messageId: string,
    executionMessage: ExecutionMessage
  ): Promise<void> {
    throw new Error(`Not implemented`);
  }

  async retrieveExecutionMessageAsync(
    executionId: string,
    messageId: string
  ): Promise<ExecutionMessage> {
    throw new Error(`Not implemented`);
  }

  async deleteExecutionMessageAsync(executionId: string, messageId: string): Promise<void> {
    throw new Error(`Not implemented`);
  }
}
