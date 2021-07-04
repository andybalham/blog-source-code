/* eslint-disable import/prefer-default-export */

export enum TestItemPrefix {
  TestInput = 'TestInput',
  TestOutput = 'TestOutput',
  MockState = 'MockState',
}

export interface TestItemKey {
  PK: string;
  SK: string;
}

export interface CurrentTestItem<T> extends TestItemKey {
  testId: string;
  inputs?: T;
}

export interface OutputTestItem<T> extends TestItemKey {
  output: T;
}

export interface MockStateTestItem<T> extends TestItemKey {
  state: T;
}
