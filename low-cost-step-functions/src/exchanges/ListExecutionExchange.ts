import { ExecutionState } from '../ExecutionRepository';

export interface ListExecutionRequest {
  isListExecutionResponse: null;
  executionId: string;
}

export interface ListExecutionResponse {
  isListExecutionResponse: null;
  executionState?: ExecutionState;
}
