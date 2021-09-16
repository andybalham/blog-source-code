/* eslint-disable class-methods-use-this */
import Orchestrator from './Orchestrator';
import DynamoDBClient from './utils/DynamoDBClient';

export enum ExecutionStatus {
  Running = 'RUNNING',
  Completed = 'SUCCEEDED',
  Failed = 'FAILED',
}

export interface ExecutionSummary {
  status: ExecutionStatus;
  startTime: number;
  endTime?: number;
  output?: Record<string, any>;
}

export interface ExecutionState {
  messageCount: number;
  data: Record<string, any>;
}

export interface ExecutionMessage {
  sentTime: number;
  stateId: string;
}

const dynamoDBClient = new DynamoDBClient(
  process.env[Orchestrator.EnvVars.EXECUTION_TABLE_NAME],
  Orchestrator.ExecutionTableSchema.partitionKey.name,
  Orchestrator.ExecutionTableSchema.sortKey.name
);

export default class ExecutionRepository {
  //
  async putExecutionSummaryAsync(
    executionId: string,
    executionSummary: ExecutionSummary
  ): Promise<void> {
    //
    await dynamoDBClient.putAsync({
      PK: executionId,
      SK: 'EXECUTION_STATE',
      executionSummary,
    });
  }

  async getExecutionSummaryAsync(executionId: string): Promise<ExecutionSummary | undefined> {
    //
    const executionSummaryItem = await dynamoDBClient.getAsync<any>({
      PK: executionId,
      SK: 'EXECUTION_STATE',
    });

    return executionSummaryItem?.executionSummary;
  }

  async putExecutionStateAsync(executionId: string, executionState: ExecutionState): Promise<void> {
    //
    await dynamoDBClient.putAsync({
      PK: executionId,
      SK: 'EXECUTION_DATA',
      executionState,
    });
  }

  async getExecutionStateAsync(executionId: string): Promise<ExecutionState> {
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
