import { ExecutionSummary } from '../ExecutionRepository';

export interface ListExecutionRequest {
  isListExecutionResponse: null;
  executionId: string;
}

export interface ListExecutionResponse {
  isListExecutionResponse: null;
  executionSummary?: ExecutionSummary;
}
