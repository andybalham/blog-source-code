export interface ListExecutionRequest {
  isListExecution: null;
  executionId: string;
}

export enum ExecutionStatus {
  Running = 'RUNNING',
  Completed = 'SUCCEEDED',
  Failed = 'FAILED',
}

export interface ListExecutionResponse {
  isListExecution: null;
  status: ExecutionStatus;
  startDate: Date;
  stopDate?: Date;
}
