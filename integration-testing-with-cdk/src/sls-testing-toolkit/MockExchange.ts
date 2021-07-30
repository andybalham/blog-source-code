export interface MockExchange {
  response?: any;
  error?: string;
  repeat?: 'FOREVER' | number; // TODO 21Jul21: Implement repeating responses
}
