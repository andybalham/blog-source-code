/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable max-classes-per-file */
import * as cdk from '@aws-cdk/core';
import sfn = require('@aws-cdk/aws-stepfunctions');

interface INextableState extends sfn.State, sfn.INextable {}

interface BuilderCatchProps extends sfn.CatchProps {
  handler: string;
}

interface BuilderTryPerformProps {
  catches: BuilderCatchProps[];
}

interface BuilderChoice {
  when: sfn.Condition;
  next: string;
}

interface BuilderChoiceProps extends sfn.ChoiceProps {
  choices: BuilderChoice[];
  otherwise: string;
}

interface BuilderMapProps extends sfn.MapProps {
  iterator: StateMachineBuilder;
  catches?: BuilderCatchProps[];
}

interface BuilderParallelProps extends sfn.ParallelProps {
  branches: StateMachineBuilder[];
  catches?: BuilderCatchProps[];
}

interface BuilderStep {
  type: StepType;
  id: string;
}

enum StepType {
  Perform = 'Perform',
  TryPerform = 'TryPerform',
  Choice = 'Choice',
  End = 'End',
  Map = 'Map',
  Parallel = 'Parallel',
}

class PerformStep implements BuilderStep {
  //
  constructor(public state: INextableState) {
    this.type = StepType.Perform;
    this.id = state.id;
  }

  type: StepType;

  id: string;
}

class TryPerformStep implements BuilderStep {
  //
  constructor(public state: sfn.TaskStateBase, public props: BuilderTryPerformProps) {
    this.type = StepType.TryPerform;
    this.id = state.id;
  }

  type: StepType;

  id: string;
}

class ChoiceStep implements BuilderStep {
  //
  constructor(public id: string, public props: BuilderChoiceProps) {
    this.type = StepType.Choice;
  }

  type: StepType;
}

class MapStep implements BuilderStep {
  //
  constructor(public id: string, public props: BuilderMapProps) {
    this.type = StepType.Map;
  }

  type: StepType;
}

class ParallelStep implements BuilderStep {
  //
  constructor(public id: string, public props: BuilderParallelProps) {
    this.type = StepType.Parallel;
  }

  type: StepType;
}

class EndStep implements BuilderStep {
  //
  constructor(suffix: number) {
    this.type = StepType.End;
    this.id = `End${suffix}`;
  }

  id: string;

  type: StepType;
}

export default class StateMachineBuilder {
  //
  private readonly steps = new Array<BuilderStep>();

  private readonly stepStateByIndex = new Map<number, sfn.State>();

  static new(): StateMachineBuilder {
    return new StateMachineBuilder();
  }

  perform(state: INextableState): StateMachineBuilder {
    this.steps.push(new PerformStep(state));
    return this;
  }

  tryPerform(state: sfn.TaskStateBase, props: BuilderTryPerformProps): StateMachineBuilder {
    this.steps.push(new TryPerformStep(state, props));
    return this;
  }

  choice(id: string, props: BuilderChoiceProps): StateMachineBuilder {
    this.steps.push(new ChoiceStep(id, props));
    return this;
  }

  end(): StateMachineBuilder {
    this.steps.push(new EndStep(this.steps.length));
    return this;
  }

  map(id: string, props: BuilderMapProps): StateMachineBuilder {
    this.steps.push(new MapStep(id, props));
    return this;
  }

  parallel(id: string, props: BuilderParallelProps): StateMachineBuilder {
    this.steps.push(new ParallelStep(id, props));
    return this;
  }

  build(scope: cdk.Construct): sfn.IChainable {
    return this.getStepChain(scope, 0);
  }

  private getStepChain(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
    //
    const visitedStepState = this.stepStateByIndex.get(stepIndex);

    if (visitedStepState !== undefined) {
      return visitedStepState;
    }

    const step = this.steps[stepIndex];

    const stepState = this.getStepState(scope, step);

    this.stepStateByIndex.set(stepIndex, stepState);

    this.addSubChains(scope, step, stepState);

    const stepChain = this.hasNextStep(stepIndex)
      ? ((stepState as unknown) as sfn.INextable).next(this.getStepChain(scope, stepIndex + 1))
      : stepState;

    return stepChain;
  }

  private getStepState(scope: cdk.Construct, step: BuilderStep) {
    //
    let stepState: sfn.State;

    switch (step.type) {
      //
      case StepType.Perform:
        stepState = (step as PerformStep).state;
        break;

      case StepType.TryPerform:
        stepState = (step as TryPerformStep).state;
        break;

      case StepType.Choice:
        stepState = new sfn.Choice(scope, step.id, (step as ChoiceStep).props);
        break;

      case StepType.Map:
        stepState = new sfn.Map(scope, step.id, (step as MapStep).props);
        break;

      case StepType.Parallel:
        stepState = new sfn.Parallel(scope, step.id, (step as ParallelStep).props);
        break;

      default:
        throw new Error(`Unhandled step type: ${JSON.stringify(step)}`);
    }

    return stepState;
  }

  private hasNextStep(stepIndex: number): boolean {
    //
    if (this.steps[stepIndex].type === StepType.Choice) {
      return false;
    }

    const isLastStep = stepIndex === this.steps.length - 1;
    const isNextStepEnd = !isLastStep && this.steps[stepIndex + 1].type === StepType.End;
    const hasNextStep = !(isLastStep || isNextStepEnd);

    return hasNextStep;
  }

  private getStepIndexById(id: string): number {
    //
    const stepIndex = this.steps.findIndex((s) => s.id === id);

    if (stepIndex === -1) {
      throw new Error(`Could not find index for id: ${id}`);
    }

    return stepIndex;
  }

  private addSubChains(scope: cdk.Construct, step: BuilderStep, stepState: sfn.State) {
    //
    switch (step.type) {
      //
      case StepType.TryPerform:
        this.addTryPerformSubChains(scope, step as TryPerformStep, stepState as sfn.TaskStateBase);
        break;

      case StepType.Choice:
        this.addChoiceSubChains(scope, step as ChoiceStep, stepState as sfn.Choice);
        break;

      case StepType.Map:
        this.addMapSubChains(scope, step as MapStep, stepState as sfn.Map);
        break;

      case StepType.Parallel:
        this.addParallelSubChains(scope, step as ParallelStep, stepState as sfn.Parallel);
        break;
    }
  }

  private addTryPerformSubChains(
    scope: cdk.Construct,
    step: TryPerformStep,
    stepState: sfn.TaskStateBase
  ): void {
    //
    step.props.catches.forEach((catchProps) => {
      //
      const handlerStepIndex = this.getStepIndexById(catchProps.handler);
      const handlerChain = this.getStepChain(scope, handlerStepIndex);

      stepState.addCatch(handlerChain, catchProps);
    });
  }

  private addChoiceSubChains(scope: cdk.Construct, step: ChoiceStep, stepState: sfn.Choice): void {
    //
    step.props.choices.forEach((choice) => {
      const nextIndex = this.getStepIndexById(choice.next);
      stepState.when(choice.when, this.getStepChain(scope, nextIndex));
    });

    const otherwiseStepIndex = this.getStepIndexById(step.props.otherwise);
    stepState.otherwise(this.getStepChain(scope, otherwiseStepIndex));
  }

  private addMapSubChains(scope: cdk.Construct, step: MapStep, stepState: sfn.Map): void {
    //
    stepState.iterator(step.props.iterator.build(scope));

    if (step.props?.catches) {
      step.props.catches.forEach((catchProps) => {
        //
        const handlerStepIndex = this.getStepIndexById(catchProps.handler);
        const handlerChain = this.getStepChain(scope, handlerStepIndex);

        stepState.addCatch(handlerChain, catchProps);
      });
    }
  }

  private addParallelSubChains(
    scope: cdk.Construct,
    step: ParallelStep,
    stepState: sfn.Parallel
  ): void {
    //
    step.props.branches.forEach((branch) => {
      stepState.branch(branch.build(scope));
    });

    if (step.props?.catches) {
      step.props.catches.forEach((catchProps) => {
        //
        const handlerStepIndex = this.getStepIndexById(catchProps.handler);
        const handlerChain = this.getStepChain(scope, handlerStepIndex);

        stepState.addCatch(handlerChain, catchProps);
      });
    }
  }
}
