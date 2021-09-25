/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { OrchestrationBuilder, OrchestratorHandler } from '../../src';
import { NumericOperation, PerformNumericOperationHandler, PublishResultHandler } from './tasks';

export interface SimpleBranchingInput {
  operationText: string;
  x: number;
  y: number;
}

export interface SimpleBranchingData {
  input: SimpleBranchingInput;
  result?: number;
}

export class SimpleBranchingHandler extends OrchestratorHandler<
  SimpleBranchingInput,
  undefined,
  SimpleBranchingData
> {
  constructor() {
    super(
      new OrchestrationBuilder<SimpleBranchingInput, undefined, SimpleBranchingData>({
        getData: (input): SimpleBranchingData => ({
          input,
        }),
      })

        .choice({
          stepId: 'match_operation_text',
          choices: [
            {
              when: (data): boolean => data.input.operationText.match(/^(add|[+]|plus)$/i) !== null,
              next: 'add_operation',
            },
            {
              when: (data): boolean =>
                data.input.operationText.match(/^(subtract|[-]|minus)$/i) !== null,
              next: 'subtract_operation',
            },
          ],
          otherwise: 'unmatched_operation',
        })

        .invokeAsync({
          stepId: 'add_operation',
          HandlerType: PerformNumericOperationHandler,
          getRequest: (data) => ({
            operation: NumericOperation.Add,
            value1: data.input.x,
            value2: data.input.y,
          }),
          updateData: (data, response) => {
            data.result = response.result;
          },
        })

        .invokeAsync({
          stepId: 'publish_add_result',
          HandlerType: PublishResultHandler,
          getRequest: (data) => ({
            summary: `Added ${data.input.x} to ${data.input.y} and got ${data.result}`,
          }),
        })

        .succeed({
          stepId: 'add_succeed',
        })

        .invokeAsync({
          stepId: 'subtract_operation',
          HandlerType: PerformNumericOperationHandler,
          getRequest: (data) => ({
            operation: NumericOperation.Subtract,
            value1: data.input.x,
            value2: data.input.y,
          }),
          updateData: (data, response) => {
            data.result = response.result;
          },
        })

        .invokeAsync({
          stepId: 'publish_subtract_result',
          HandlerType: PublishResultHandler,
          getRequest: (data) => ({
            summary: `Subtracted ${data.input.y} from ${data.input.x} and got ${data.result}`,
          }),
        })

        .succeed({
          stepId: 'subtract_succeed',
        })

        .fail({
          stepId: 'unmatched_operation',
        })

        .build()
    );
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const handler = async (event: any): Promise<any> =>
  new SimpleBranchingHandler().handleAsync(event);
