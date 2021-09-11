export interface ListExecutionRequest {
  isListExecutionResponse: null;
  executionId: string;
}

export enum ExecutionStatus {
  Running = 'RUNNING',
  Completed = 'SUCCEEDED',
  Failed = 'FAILED',
}

export interface ListExecutionResponse {
  isListExecutionResponse: null;
  status: ExecutionStatus;
  startDate: Date;
  stopDate?: Date;
  state?: Record<string, any>;
}
