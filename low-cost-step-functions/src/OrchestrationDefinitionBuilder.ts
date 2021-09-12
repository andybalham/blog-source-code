/* eslint-disable class-methods-use-this */
import OrchestrationDefinition from './OrchestrationDefinition';

export default class OrchestrationDefinitionBuilder<TInput, TOutput, TData> {
  //
  constructor(private getData: (input: TInput) => TData) {}

  lambdaInvokeAsync<TReq, TRes>(
    stateId: string,
    handlerName: string,
    getRequest: (data: TData) => TReq,
    updateData: (data: TData, response: TRes) => void
  ): OrchestrationDefinitionBuilder<TInput, TOutput, TData> {
    return this;
  }

  build(getOutput?: (data: TData) => TOutput): OrchestrationDefinition<TInput, TOutput, TData> {
    return new OrchestrationDefinition<TInput, TOutput, TData>();
  }
}
