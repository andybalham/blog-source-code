export default class OrchestrationDefinition<TInput, TOutput, TData> {
  getData: (input: TInput) => TData;

  getOutput?: (data: TData) => TOutput;
}
