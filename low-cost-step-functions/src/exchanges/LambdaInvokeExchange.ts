export interface LambdaInvokeRequest {
  isLambdaInvokeRequest: null;
  messageId: string;
  executionId: string;
  payload?: Record<string, any>;
}

export interface LambdaInvokeResponse {
  executionId: string;
  messageId: string;
  payload?: Record<string, any>;
}
