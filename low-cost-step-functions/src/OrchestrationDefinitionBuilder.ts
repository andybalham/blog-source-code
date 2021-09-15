/* eslint-disable class-methods-use-this */
import LambdaTaskHandler from './LambdaTaskHandler';
import OrchestrationDefinition from './OrchestrationDefinition';

export interface OrchestrationDefinitionBuilderProps<TInput, TOutput, TData> {
  initialiseData: (input: TInput) => TData;
  getOutput?: (data: TData) => TOutput;
}

export default class OrchestrationDefinitionBuilder<TInput, TOutput, TData> {
  //
  constructor(public props: OrchestrationDefinitionBuilderProps<TInput, TOutput, TData>) {}

  invokeLambdaAsync<TReq, TRes>({
    stateId,
    handlerType,
    getRequest,
    updateData,
  }: {
    stateId: string;
    handlerType: new () => LambdaTaskHandler<TReq, TRes>;
    getRequest: (data: TData) => TReq;
    updateData: (data: TData, response: TRes) => void;
  }): OrchestrationDefinitionBuilder<TInput, TOutput, TData> {
    return this;
  }

  build(): OrchestrationDefinition<TInput, TOutput, TData> {
    return new OrchestrationDefinition<TInput, TOutput, TData>();
  }
}
