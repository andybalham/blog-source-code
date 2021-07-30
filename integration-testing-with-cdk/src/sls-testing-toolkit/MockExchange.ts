// TODO 21Jul21: Rather that pass in assertions here, the mock should record invocations.
//               The unit test could then assert anything it likes about them, number and so forth.
export interface MockExchange {
  response?: any;
  error?: string;
  repeat?: 'FOREVER' | number; // TODO 21Jul21: Implement repeating responses
}
