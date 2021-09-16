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
      >({
        getData: (input): SimpleSequenceData => ({
          ...input,
          total: 0,
        }),
        getOutput: (data): SimpleSequenceOutput => ({ total: data.total }),
      })

        .invokeLambdaAsync({
          stateId: 'AddX&Y',
          handlerType: AddTwoNumbersTaskHandler,
          getRequest: (data) => ({
            value1: data.x,
            value2: data.y,
          }),
          updateData: (data, response) => {
            data.total = response.total;
          },
        })

        .invokeLambdaAsync({
          stateId: 'AddZ&Total',
          handlerType: AddTwoNumbersTaskHandler,
          getRequest: (data) => ({
            value1: data.z,
            value2: data.total,
          }),
          updateData: (data, response) => {
            data.total = response.total;
          },
        })

        .build()
    );
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const handler = async (event: any): Promise<any> =>
  new SimpleSequenceHandler().handleAsync(event);
