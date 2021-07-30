import { MockExchange } from './MockExchange';


export interface TestProps {
  testId: string;
  inputs?: Record<string, any>;
  mocks?: Record<string, MockExchange[]>;
}
