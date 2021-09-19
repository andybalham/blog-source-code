/* eslint-disable class-methods-use-this */
import { TaskHandler } from './TaskHandler';

export interface OrchestrationStep {
  stepId: string;
}

export interface Orchestration<TInput, TOutput, TData> {
  getData: (input: TInput) => TData;
  getOutput?: (data: TData) => TOutput;
  steps: Array<
    | TaskOrchestrationStep<any, any, TData>
    | SucceedOrchestrationStep
    | FailOrchestrationStep
    | NextOrchestrationStep
    | ChoiceOrchestrationStep<TData>
  >;
}

export interface SucceedOrchestrationStep extends OrchestrationStep {
  isSucceed: null;
  comment?: string;
}

export interface FailOrchestrationStep extends OrchestrationStep {
  isFail: null;
  comment?: string;
}

export interface NextOrchestrationStep extends OrchestrationStep {
  isNext: null;
}

interface OrchestrationChoice<TData> {
  when: (data: TData) => boolean;
  next: string;
}

export interface ChoiceOrchestrationStep<TData> extends OrchestrationStep {
  isChoice: null;
  choices: OrchestrationChoice<TData>[];
  otherwise: string;
}

export interface TaskOrchestrationStep<TReq, TRes, TData> extends OrchestrationStep {
  HandlerType: new () => TaskHandler<TReq, TRes>;
  getRequest: (data: TData) => TReq;
  updateData?: (data: TData, response: TRes) => void;
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
  private readonly orchestrationSteps = new Array<
    | TaskOrchestrationStep<any, any, TData>
    | SucceedOrchestrationStep
    | FailOrchestrationStep
    | NextOrchestrationStep
    | ChoiceOrchestrationStep<TData>
  >();

  constructor(public props: OrchestrationBuilderProps<TInput, TOutput, TData>) {}

  invoke<TReq, TRes>(
    props: TaskOrchestrationStep<TReq, TRes, TData>
  ): OrchestrationBuilder<TInput, TOutput, TData> {
    //
    const lambdaInvokeStep: SyncTaskOrchestrationStep<TReq, TRes, TData> = {
      isSyncTask: null,
      ...props,
    };

    this.orchestrationSteps.push(lambdaInvokeStep);

    return this;
  }

  invokeAsync<TReq, TRes>(
    props: TaskOrchestrationStep<TReq, TRes, TData>
  ): OrchestrationBuilder<TInput, TOutput, TData> {
    //
    const lambdaInvokeStep: AsyncTaskOrchestrationStep<TReq, TRes, TData> = {
      isAsyncTask: null,
      ...props,
    };

    this.orchestrationSteps.push(lambdaInvokeStep);

    return this;
  }

  choice(
    props: Omit<ChoiceOrchestrationStep<TData>, 'isChoice'>
  ): OrchestrationBuilder<TInput, TOutput, TData> {
    //
    const step: ChoiceOrchestrationStep<TData> = {
      ...props,
      isChoice: null,
    };

    this.orchestrationSteps.push(step);

    return this;
  }

  goto(props: Omit<NextOrchestrationStep, 'isNext'>): OrchestrationBuilder<TInput, TOutput, TData> {
    //
    const step: NextOrchestrationStep = {
      ...props,
      isNext: null,
    };

    this.orchestrationSteps.push(step);

    return this;
  }

  succeed(
    props: Omit<SucceedOrchestrationStep, 'isSucceed'>
  ): OrchestrationBuilder<TInput, TOutput, TData> {
    //
    const step: SucceedOrchestrationStep = {
      ...props,
      isSucceed: null,
    };

    this.orchestrationSteps.push(step);

    return this;
  }

  fail(props: Omit<FailOrchestrationStep, 'isFail'>): OrchestrationBuilder<TInput, TOutput, TData> {
    //
    const step: FailOrchestrationStep = {
      ...props,
      isFail: null,
    };

    this.orchestrationSteps.push(step);

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
