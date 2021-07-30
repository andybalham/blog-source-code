/* eslint-disable import/prefer-default-export */

import { MockExchange } from "./MockExchange";
import { MockInvocation } from "./MockInvocation";
import { TestObservation } from "./TestObservation";

export enum TestItemPrefix {
  TestInput = 'TestInput',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  TestObservation = 'TestObservation',
  MockState = 'MockState',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  MockInvocation = 'MockInvocation',
}

export interface TestItemKey {
  PK: string;
  SK: string;
}

export interface CurrentTestItem<T> extends TestItemKey {
  testId: string;
  inputs?: T;
  mocks?: Record<string, MockExchange[]>;
}

export interface ObservationTestItem extends TestItemKey {
  observation: TestObservation;
}

export interface InvocationTestItem extends TestItemKey {
  invocation: MockInvocation;
}

export interface MockStateTestItem extends TestItemKey {
  state: Record<string, any>;
}
