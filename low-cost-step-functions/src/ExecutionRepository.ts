/* eslint-disable class-methods-use-this */
import Orchestrator from './Orchestrator';
import DynamoDBClient from './utils/DynamoDBClient';

export enum ExecutionStatus {
  Running = 'RUNNING',
  Succeeded = 'SUCCEEDED',
  Failed = 'FAILED',
}

export interface ExecutionState<TData> {
  status: ExecutionStatus;
  startTime: number;
  messageCount: number;
  data: TData;
  endTime?: number;
  output?: Record<string, any>;
}

export interface ExecutionMessage {
  messageId: string;
  stepId: string;
  sentTime: number;
}

const dynamoDBClient = new DynamoDBClient(
  process.env[Orchestrator.EnvVars.EXECUTION_TABLE_NAME],
  Orchestrator.ExecutionTableSchema.partitionKey.name,
  Orchestrator.ExecutionTableSchema.sortKey.name
);

interface ExecutionItemKey {
  PK: string;
  SK: string;
}

interface ExecutionItem extends ExecutionItemKey {
  item: Record<string, any>;
}

export default class ExecutionRepository {
  //
  static readonly StateSK = 'STATE';

  static readonly MessageSKPrefix = 'MSG_';

  async putExecutionStateAsync<TData>(
    executionId: string,
    executionState: ExecutionState<TData>
  ): Promise<void> {
    //
    const stateItem: ExecutionItem = {
      PK: executionId,
      SK: ExecutionRepository.StateSK,
      item: executionState,
    };

    await dynamoDBClient.putAsync(stateItem);
  }

  async getExecutionStateAsync<TData>(
    executionId: string
  ): Promise<ExecutionState<TData> | undefined> {
    //
    const executionStateItemKey: ExecutionItemKey = {
      PK: executionId,
      SK: ExecutionRepository.StateSK,
    };

    const executionStateItem = await dynamoDBClient.getAsync<ExecutionItem>(executionStateItemKey);

    return executionStateItem?.item as ExecutionState<TData>;
  }

  async putExecutionMessageAsync(
    executionId: string,
    executionMessage: ExecutionMessage
  ): Promise<void> {
    //
    const stateItem: ExecutionItem = {
      PK: executionId,
      SK: ExecutionRepository.getExecutionMessageSK(executionMessage.messageId),
      item: executionMessage,
    };

    await dynamoDBClient.putAsync(stateItem);
  }

  async getExecutionMessageAsync(
    executionId: string,
    messageId: string
  ): Promise<ExecutionMessage | undefined> {
    //
    const executionMessageItemKey: ExecutionItemKey = {
      PK: executionId,
      SK: ExecutionRepository.getExecutionMessageSK(messageId),
    };

    const executionMessageItem = await dynamoDBClient.getAsync<ExecutionItem>(
      executionMessageItemKey
    );

    return executionMessageItem?.item as ExecutionMessage;
  }

  async deleteExecutionMessageAsync(executionId: string, messageId: string): Promise<void> {
    //
    const executionMessageItemKey: ExecutionItemKey = {
      PK: executionId,
      SK: ExecutionRepository.getExecutionMessageSK(messageId),
    };

    await dynamoDBClient.deleteAsync(executionMessageItemKey);
  }

  private static getExecutionMessageSK(messageId: string): string {
    return ExecutionRepository.MessageSKPrefix + messageId;
  }
}
