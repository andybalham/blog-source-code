export interface MockExchange {
  response?: any;
  error?: string;
  repeat?: 'FOREVER' | number;
}
