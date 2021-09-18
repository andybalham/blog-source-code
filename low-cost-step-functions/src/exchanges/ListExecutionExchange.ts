import { ExecutionStatus } from '../ExecutionRepository';

export interface ListExecutionRequest {
  isListExecutionResponse: null;
  executionId: string;
}

export interface ListExecutionResponse {
  status?: ExecutionStatus;
  startTime?: number;
  endTime?: number;
  output?: Record<string, any>;
}
