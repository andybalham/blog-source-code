/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable max-classes-per-file */
import * as cdk from '@aws-cdk/core';
import sfn = require('@aws-cdk/aws-stepfunctions');

interface BuilderStep {
  type: StepType;
  id: string;
}

enum StepType {
  Perform = 'Perform',
  Choice = 'Choice',
  End = 'End',
}

interface INextableState extends sfn.State, sfn.INextable {}

class PerformStep implements BuilderStep {
  //
  constructor(public state: INextableState) {
    this.type = StepType.Perform;
    this.id = state.id;
  }

  type: StepType;

  id: string;
}

interface BuilderChoice {
  when: sfn.Condition;
  next: string;
}

interface BuilderChoiceProps extends sfn.ChoiceProps {
  choices: BuilderChoice[];
  otherwise: string;
}

class ChoiceStep implements BuilderStep {
  //
  constructor(public id: string, public props: BuilderChoiceProps) {
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

export default class StateMachineBuilder {
  //
  private readonly steps = new Array<BuilderStep>();

  private readonly stepIndexesById = new Map<string, number>();

  private readonly stepChainableByIndex = new Map<number, sfn.IChainable>();

  static new(): StateMachineBuilder {
    return new StateMachineBuilder();
  }

  perform(state: INextableState): StateMachineBuilder {
    this.steps.push(new PerformStep(state));
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

  build(scope: cdk.Construct): sfn.IChainable {
    this.buildStepIndexesById();
    return this.getStepChainable(scope, 0);
  }

  private buildStepIndexesById(): void {
    //
    if (this.steps.length === 0) {
      throw new Error(`No steps defined`);
    }

    const duplicateSteps = new Array<string>();

    this.steps.forEach((step, stepIndex) => {
      if (this.stepIndexesById.has(step.id)) {
        duplicateSteps.push(step.id);
      } else {
        this.stepIndexesById.set(step.id, stepIndex);
      }
    });

    if (duplicateSteps.length > 0) {
      throw new Error(`Duplicate steps found: ${JSON.stringify(duplicateSteps)}`);
    }
  }

  private getStepIndexById(id: string): number {
    //
    const stepIndex = this.stepIndexesById.get(id);

    if (stepIndex === undefined) {
      throw new Error(`Could not find index for id: ${id}`);
    }

    return stepIndex;
  }

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

    return stepChainable;
  }

  private isNextStep(stepIndex: number): boolean {
    //
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

    const otherwiseStepIndex = this.getStepIndexById(step.props.otherwise);

    stepChainable.otherwise(this.getStepChainable(scope, otherwiseStepIndex));

    return stepChainable;
  }
}
