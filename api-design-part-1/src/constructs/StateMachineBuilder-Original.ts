/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable import/prefer-default-export */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-new */
/* eslint-disable max-classes-per-file */
import * as cdk from '@aws-cdk/core';
import sfn = require('@aws-cdk/aws-stepfunctions');

interface BuilderCatchProps extends sfn.CatchProps {
  goto: string;
}

interface PerformProps {
  catch: BuilderCatchProps[];
}

interface ChoiceCase {
  when: sfn.Condition;
  next: string;
}

interface EvaluateChoiceProps extends sfn.ChoiceProps {
  choices: ChoiceCase[];
}

interface PerformMapProps extends sfn.MapProps {
  iterator: StateMachineBuilder;
}

interface PerformParallelProps extends sfn.ParallelProps {
  branches: StateMachineBuilder[];
}

interface BuilderStep {
  type: StepType;
  id: string;
}

enum StepType {
  Perform = 'Perform',
  Choice = 'Choice',
  End = 'End',
}

class PerformStep implements BuilderStep {
  //
  constructor(public state: INextableState, public props?: PerformProps) {
    this.type = StepType.Perform;
    this.id = state.id;
  }

  type: StepType;

  id: string;
}

class ChoiceStep implements BuilderStep {
  //
  constructor(public id: string, public props: EvaluateChoiceProps) {
    this.type = StepType.Choice;
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

interface INextableState extends sfn.State, sfn.INextable {}

export class StateMachineBuilder {
  //
  private readonly steps = new Array<BuilderStep>();

  private stepIndexesById = new Map<string, number>();

  static new(): StateMachineBuilder {
    return new StateMachineBuilder();
  }

  perform(state: INextableState, props?: PerformProps): StateMachineBuilder {
    this.steps.push(new PerformStep(state, props));
    return this;
  }

  map(id: string, props: PerformMapProps): StateMachineBuilder {
    return this;
  }

  parallel(id: string, props: PerformParallelProps): StateMachineBuilder {
    return this;
  }

  choice(id: string, props: EvaluateChoiceProps): StateMachineBuilder {
    this.steps.push(new ChoiceStep(id, props));
    return this;
  }

  goto(targetId: string): StateMachineBuilder {
    return this;
  }

  label(id: string): StateMachineBuilder {
    return this;
  }

  end(): StateMachineBuilder {
    this.steps.push(new EndStep(this.steps.length));
    return this;
  }

  build(scope: cdk.Construct): sfn.IChainable {
    //
    if (this.steps.length === 0) {
      throw new Error(`No steps defined`);
    }

    this.stepIndexesById = this.getStepIndexesById();

    return this.getStepChainable(scope, 0);
  }

  private getStepIndexesById(): Map<string, number> {
    //
    const stepIndexesById = new Map<string, number>();
    const duplicateSteps = new Array<string>();

    this.steps.forEach((step, stepIndex) => {
      if (stepIndexesById.has(step.id)) {
        duplicateSteps.push(step.id);
      } else {
        stepIndexesById.set(step.id, stepIndex);
      }
    });

    if (duplicateSteps.length > 0) {
      throw new Error(`Duplicate steps found: ${JSON.stringify(duplicateSteps)}`);
    }

    return stepIndexesById;
  }

  private readonly stepChainableByIndex = new Map<number, sfn.IChainable>();

  private getStepChainable(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
    //
    const existingStepChainable = this.stepChainableByIndex.get(stepIndex);

    if (existingStepChainable !== undefined) {
      return existingStepChainable;
    }

    const step = this.steps[stepIndex];

    let stepChainable: sfn.IChainable;

    switch (step.type) {
      //
      case StepType.Perform:
        stepChainable = this.getPerformStepChainable(scope, stepIndex);
        break;

      case StepType.Choice:
        stepChainable = this.getChoiceStepChainable(scope, stepIndex);
        break;

      default:
        throw new Error(`Unhandled step type: ${step.type}`);
    }

    this.stepChainableByIndex.set(stepIndex, stepChainable);

    return stepChainable;
  }

  private getPerformStepChainable(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
    //
    const step = this.steps[stepIndex] as PerformStep;

    const isNextStep = this.isNextStep(stepIndex);

    const stepChainable = isNextStep
      ? (step as PerformStep).state.next(this.getStepChainable(scope, stepIndex + 1))
      : (step as PerformStep).state;

    // TODO 01May21: Add catches

    return stepChainable;
  }

  private isNextStep(stepIndex: number): boolean {
    const isLastStep = stepIndex === this.steps.length - 1;
    const isNextStepEnd = !isLastStep && this.steps[stepIndex + 1].type === StepType.End;
    const isNextStep = !(isLastStep || isNextStepEnd);
    return isNextStep;
  }

  private getChoiceStepChainable(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
    //
    const step = this.steps[stepIndex] as ChoiceStep;

    const stepChainable = new sfn.Choice(scope, step.id, step.props);

    step.props.choices.forEach((choice) => {
      const gotoIndex = this.getStepIndexById(choice.next);
      stepChainable.when(choice.when, this.getStepChainable(scope, gotoIndex));
    });

    if (this.isNextStep(stepIndex)) {
      stepChainable.otherwise(this.getStepChainable(scope, stepIndex + 1));
    }

    return stepChainable;
  }

  private getStepIndexById(id: string): number {
    //
    const stepIndex = this.stepIndexesById.get(id);

    if (stepIndex === undefined) {
      throw new Error(`Could not find index for id: ${id}`);
    }

    return stepIndex;
  }
}
