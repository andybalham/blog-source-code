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
  goto: string;
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
}

class PerformStep implements BuilderStep {
  //
  constructor(public state: sfn.TaskStateBase, public props?: PerformProps) {
    this.type = StepType.Perform;
    this.id = state.id;
  }

  type: StepType;

  id: string;
}

class ChoiceStep implements BuilderStep {
  //
  constructor(public id: string, public props: EvaluateChoiceProps) {
    this.type = StepType.Perform;
  }

  type: StepType;
}

export class StateMachineBuilder {
  //
  // TODO 18Apr21: The following will need to store the details for each method, e.g. id & props
  private readonly steps = new Array<BuilderStep>();

  private stepIndexesById = new Map<string, number>();

  perform(state: sfn.TaskStateBase, props?: PerformProps): StateMachineBuilder {
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
    return this;
  }

  build(scope: cdk.Construct): sfn.IChainable {
    //
    if (this.steps.length === 0) {
      throw new Error(`No steps defined`);
    }

    this.stepIndexesById = this.getStepIndexesById();

    return this.getStepChainable(0);
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

  private getStepChainable(stepIndex: number): sfn.IChainable {
    //
    const step = this.steps[stepIndex];

    switch (step.type) {
      //
      case StepType.Perform:
        return stepIndex < this.steps.length - 1
          ? (step as PerformStep).state.next(this.getStepChainable(stepIndex + 1))
          : (step as PerformStep).state;

      default:
        throw new Error(`Unhandled step type: ${step.type}`);
    }
  }
}
