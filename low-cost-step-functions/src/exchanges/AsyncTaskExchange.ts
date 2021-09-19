export interface AsyncTaskRequest {
  isAsyncTaskRequest: null;
  messageId: string;
  executionId: string;
  payload?: Record<string, any>;
}

export interface AsyncTaskResponse {
  isAsyncTaskResponse: null;
  executionId: string;
  messageId: string;
  payload?: Record<string, any>;
}
