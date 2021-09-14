/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { OrchestrationDefinitionBuilder, OrchestratorHandler } from '../../src';
import { AddTwoNumbersTaskHandler } from './AddTwoNumbersTask.handler';

export interface SimpleSequenceInput {
  x: number;
  y: number;
  z: number;
}

export interface SimpleSequenceOutput {
  total: number;
}

export interface SimpleSequenceData {
  x: number;
  y: number;
  z: number;
  total: number;
}

class SimpleSequenceHandler extends OrchestratorHandler<
  SimpleSequenceInput,
  SimpleSequenceOutput,
  SimpleSequenceData
> {
  constructor() {
    super(
      new OrchestrationDefinitionBuilder<
        SimpleSequenceInput,
        SimpleSequenceOutput,
        SimpleSequenceData
      >((input) => ({
        ...input,
        total: 0,
      }))

        .lambdaInvokeAsync(
          'AddX&Y',
          AddTwoNumbersTaskHandler,
          (data) => ({
            value1: data.x,
            value2: data.y,
          }),
          (data, response) => {
            data.total = response.total;
          }
        )

        .lambdaInvokeAsync(
          'AddZ&Total',
          AddTwoNumbersTaskHandler,
          (data) => ({
            value1: data.z,
            value2: data.total,
          }),
          (data, response) => {
            data.total = response.total;
          }
        )

        .build((data) => ({ total: data.total }))
    );
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const handler = async (event: any): Promise<any> =>
  new SimpleSequenceHandler().handleAsync(event);
