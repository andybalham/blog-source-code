/* eslint-disable class-methods-use-this */
import LambdaTaskHandler from './LambdaTaskHandler';

export interface OrchestrationStep {
  stepId: string;
}

export interface Orchestration<TInput, TOutput, TData> {
  getData: (input: TInput) => TData;
  getOutput?: (data: TData) => TOutput;
  steps: Array<LambdaInvokeOrchestrationStep<any, any, TData>>;
}

export interface LambdaInvokeOrchestrationStep<TReq, TRes, TData> extends OrchestrationStep {
  isLambdaInvoke: null;
  stepId: string;
  HandlerType: new () => LambdaTaskHandler<TReq, TRes>;
  getRequest: (data: TData) => TReq;
  updateData: (data: TData, response: TRes) => void;
}

export interface OrchestrationBuilderProps<TInput, TOutput, TData> {
  getData: (input: TInput) => TData;
  getOutput?: (data: TData) => TOutput;
}

export default class OrchestrationBuilder<TInput, TOutput, TData> {
  //
  private readonly orchestrationSteps = new Array<LambdaInvokeOrchestrationStep<any, any, TData>>();

  constructor(public props: OrchestrationBuilderProps<TInput, TOutput, TData>) {}

  invokeLambdaAsync<TReq, TRes>(
    lambdaInvokeProps: Omit<LambdaInvokeOrchestrationStep<TReq, TRes, TData>, 'isLambdaInvoke'>
  ): OrchestrationBuilder<TInput, TOutput, TData> {
    //
    const lambdaInvokeStep: LambdaInvokeOrchestrationStep<TReq, TRes, TData> = {
      isLambdaInvoke: null,
      ...lambdaInvokeProps,
    };

    this.orchestrationSteps.push(lambdaInvokeStep);

    return this;
  }

  build(): Orchestration<TInput, TOutput, TData> {
    const definition: Orchestration<TInput, TOutput, TData> = {
      getData: this.props.getData,
      getOutput: this.props.getOutput,
      steps: this.orchestrationSteps,
    };
    return definition;
  }
}
