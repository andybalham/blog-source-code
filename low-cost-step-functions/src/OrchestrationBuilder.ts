/* eslint-disable class-methods-use-this */
import { TaskHandler } from './TaskHandler';

export interface OrchestrationStep {
  stepId: string;
}

export interface Orchestration<TInput, TOutput, TData> {
  getData: (input: TInput) => TData;
  getOutput?: (data: TData) => TOutput;
  steps: Array<TaskOrchestrationStep<any, any, TData>>;
}

export interface TaskOrchestrationStep<TReq, TRes, TData> extends OrchestrationStep {
  HandlerType: new () => TaskHandler<TReq, TRes>;
  getRequest: (data: TData) => TReq;
  updateData: (data: TData, response: TRes) => void;
}

export interface SyncTaskOrchestrationStep<TReq, TRes, TData>
  extends TaskOrchestrationStep<TReq, TRes, TData> {
  isSyncTask: null;
}

export interface AsyncTaskOrchestrationStep<TReq, TRes, TData>
  extends TaskOrchestrationStep<TReq, TRes, TData> {
  isAsyncTask: null;
}

export interface OrchestrationBuilderProps<TInput, TOutput, TData> {
  getData: (input: TInput) => TData;
  getOutput?: (data: TData) => TOutput;
}

export default class OrchestrationBuilder<TInput, TOutput, TData> {
  //
  private readonly orchestrationSteps = new Array<TaskOrchestrationStep<any, any, TData>>();

  constructor(public props: OrchestrationBuilderProps<TInput, TOutput, TData>) {}

  invoke<TReq, TRes>(
    taskProps: TaskOrchestrationStep<TReq, TRes, TData>
  ): OrchestrationBuilder<TInput, TOutput, TData> {
    //
    const lambdaInvokeStep: SyncTaskOrchestrationStep<TReq, TRes, TData> = {
      isSyncTask: null,
      ...taskProps,
    };

    this.orchestrationSteps.push(lambdaInvokeStep);

    return this;
  }

  invokeAsync<TReq, TRes>(
    taskProps: TaskOrchestrationStep<TReq, TRes, TData>
  ): OrchestrationBuilder<TInput, TOutput, TData> {
    //
    const lambdaInvokeStep: AsyncTaskOrchestrationStep<TReq, TRes, TData> = {
      isAsyncTask: null,
      ...taskProps,
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
