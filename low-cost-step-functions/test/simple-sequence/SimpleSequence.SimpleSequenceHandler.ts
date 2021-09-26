/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import {
  OrchestrationBuilder,
  OrchestrationBuilderProps,
  OrchestratorHandler,
} from '../../src';
import { AddTwoNumbersHandler } from './AddTwoNumbers.AddTwoNumbersHandler';

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

const orchestrationProps: OrchestrationBuilderProps<
  SimpleSequenceInput,
  SimpleSequenceOutput,
  SimpleSequenceData
> = {
  getData: (input): SimpleSequenceData => ({
    ...input,
    total: 0,
  }),
  getOutput: (data): SimpleSequenceOutput => ({ total: data.total }),
};

const orchestration = new OrchestrationBuilder<
  SimpleSequenceInput,
  SimpleSequenceOutput,
  SimpleSequenceData
>(orchestrationProps)

  .invokeAsync({
    stepId: 'AddX&Y',
    HandlerType: AddTwoNumbersHandler,
    getRequest: (data) => ({
      value1: data.x,
      value2: data.y,
    }),
    updateData: (data, response) => {
      data.total = response.total;
    },
  })

  .invokeAsync({
    stepId: 'AddZ&Total',
    HandlerType: AddTwoNumbersHandler,
    getRequest: (data) => ({
      value1: data.z,
      value2: data.total,
    }),
    updateData: (data, response) => {
      data.total = response.total;
    },
  })

  .build();

export class SimpleSequenceHandler extends OrchestratorHandler<
  SimpleSequenceInput,
  SimpleSequenceOutput,
  SimpleSequenceData
> {
  constructor() {
    super(orchestration);
  }
}

export const handler = async (event: any): Promise<any> =>
  new SimpleSequenceHandler().handleAsync(event);
