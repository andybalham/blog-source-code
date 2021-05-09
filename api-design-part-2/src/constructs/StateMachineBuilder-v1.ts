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

enum StepType {
  Perform = 'Perform',
  TryPerform = 'TryPerform',
  Choice = 'Choice',
  End = 'End',
  Map = 'Map',
  Parallel = 'Parallel',
}

interface BuilderStep {
  type: StepType;
  id: string;
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

  static new(): StateMachineBuilder {
    return new StateMachineBuilder();
  }

  perform(state: INextableState): StateMachineBuilder {
    this.steps.push(new PerformStep(state));
    return this;
  }

  tryPerform(state: sfn.TaskStateBase, props: BuilderTryPerformProps): StateMachineBuilder {
    // this.steps.push(new TryPerformStep(state, props));
    return this;
  }

  choice(id: string, props: BuilderChoiceProps): StateMachineBuilder {
    // this.steps.push(new ChoiceStep(id, props));
    return this;
  }

  end(): StateMachineBuilder {
    // this.steps.push(new EndStep(this.steps.length));
    return this;
  }

  map(id: string, props: BuilderMapProps): StateMachineBuilder {
    // this.steps.push(new MapStep(id, props));
    return this;
  }

  parallel(id: string, props: BuilderParallelProps): StateMachineBuilder {
    // this.steps.push(new ParallelStep(id, props));
    return this;
  }

  build(scope: cdk.Construct): sfn.IChainable {
    return this.getStepChain(scope, 0);
  }

  private getStepChain(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
    //
    const step = this.steps[stepIndex];

    let stepChain: sfn.IChainable;

    switch (step.type) {
      //
      case StepType.Perform:
        stepChain = this.getPerformStepChain(scope, stepIndex);
        break;

      case StepType.TryPerform:
        stepChain = this.getTryPerformStepChain(scope, stepIndex);
        break;

      case StepType.Choice:
        stepChain = this.getChoiceStepChain(scope, stepIndex);
        break;

      case StepType.Map:
        stepChain = this.getMapStepChain(scope, stepIndex);
        break;

      case StepType.Parallel:
        stepChain = this.getParallelStepChain(scope, stepIndex);
        break;

      default:
        throw new Error(`Unhandled step type: ${JSON.stringify(step)}`);
    }

    return stepChain;
  }

  private getPerformStepChain(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
    //
    const step = this.steps[stepIndex] as PerformStep;

    const stepState = (step as PerformStep).state;

    const stepChain = this.hasNextStep(stepIndex)
      ? stepState.next(this.getStepChain(scope, stepIndex + 1))
      : stepState;

    return stepChain;
  }

  private hasNextStep(stepIndex: number): boolean {
    //
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

  private getTryPerformStepChain(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
    //
    const step = this.steps[stepIndex] as TryPerformStep;

    const stepState = (step as TryPerformStep).state;

    step.props.catches.forEach((catchProps) => {
      //
      const handlerStepIndex = this.getStepIndexById(catchProps.handler);
      const handlerChainable = this.getStepChain(scope, handlerStepIndex);

      stepState.addCatch(handlerChainable, catchProps);
    });

    const stepChain = this.hasNextStep(stepIndex)
      ? stepState.next(this.getStepChain(scope, stepIndex + 1))
      : stepState;

    return stepChain;
  }

  private getChoiceStepChain(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
    //
    const step = this.steps[stepIndex] as ChoiceStep;

    const stepChain = new sfn.Choice(scope, step.id, step.props);

    step.props.choices.forEach((choice) => {
      const gotoIndex = this.getStepIndexById(choice.next);
      stepChain.when(choice.when, this.getStepChain(scope, gotoIndex));
    });

    const otherwiseStepIndex = this.getStepIndexById(step.props.otherwise);

    stepChain.otherwise(this.getStepChain(scope, otherwiseStepIndex));

    return stepChain;
  }

  private getMapStepChain(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
    //
    const step = this.steps[stepIndex] as MapStep;

    const map = new sfn.Map(scope, step.id, step.props);

    map.iterator(step.props.iterator.build(scope));

    if (step.props?.catches) {
      step.props.catches.forEach((catchProps) => {
        //
        const handlerStepIndex = this.getStepIndexById(catchProps.handler);
        const handlerChainable = this.getStepChain(scope, handlerStepIndex);

        map.addCatch(handlerChainable, catchProps);
      });
    }

    const hasNextStep = this.hasNextStep(stepIndex);

    const stepChain = hasNextStep ? map.next(this.getStepChain(scope, stepIndex + 1)) : map;

    return stepChain;
  }

  private getParallelStepChain(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
    //
    const step = this.steps[stepIndex] as ParallelStep;

    const parallel = new sfn.Parallel(scope, step.id, step.props);

    step.props.branches.forEach((branch) => {
      parallel.branch(branch.build(scope));
    });

    if (step.props?.catches) {
      step.props.catches.forEach((catchProps) => {
        //
        const handlerStepIndex = this.getStepIndexById(catchProps.handler);
        const handlerChainable = this.getStepChain(scope, handlerStepIndex);

        parallel.addCatch(handlerChainable, catchProps);
      });
    }

    const hasNextStep = this.hasNextStep(stepIndex);

    const stepChain = hasNextStep
      ? parallel.next(this.getStepChain(scope, stepIndex + 1))
      : parallel;

    return stepChain;
  }
}
