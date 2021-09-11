export interface LambdaInvokeRequest {
  isLambdaInvokeRequest: null;
  messageId: string;
  executionId: string;
  payload?: Record<string, any>;
}

export interface LambdaInvokeResponse {
  isLambdaInvokeResponse: null;
  messageId: string;
  executionId: string;
  payload?: Record<string, any>;
}
