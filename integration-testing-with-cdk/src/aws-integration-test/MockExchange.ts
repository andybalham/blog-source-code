export interface MockExchange {
  assert?: {
    requiredProperties?: string[];
  };
  error?: string;
  response?: any;
}
