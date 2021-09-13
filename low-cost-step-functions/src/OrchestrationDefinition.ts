export default class OrchestrationDefinition<TInput, TOutput, TData> {
  constructor(public getData: (input: TInput) => TData) {}
}
