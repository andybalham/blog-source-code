/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import sfn = require('@aws-cdk/aws-stepfunctions');

interface BuilderChoice {
  when: sfn.Condition;
  next: string;
}

interface BuilderChoiceProps extends sfn.ChoiceProps {
  choices: BuilderChoice[];
  otherwise: string;
}

interface BuilderParallelProps extends sfn.ParallelProps {
  branches: StateMachineBuilder[];
}

interface BuilderMapProps extends sfn.MapProps {
  iterator: StateMachineBuilder;
}

export default class StateMachineBuilder {
  //
  perform(state: sfn.State): StateMachineBuilder {
    return this;
  }

  map(id: string, props: BuilderMapProps): StateMachineBuilder {
    return this;
  }

  parallel(id: string, props: BuilderParallelProps): StateMachineBuilder {
    return this;
  }

  choice(id: string, props: BuilderChoiceProps): StateMachineBuilder {
    return this;
  }

  end(): StateMachineBuilder {
    return this;
  }

  // eslint-disable-next-line class-methods-use-this
  build(scope: cdk.Construct): sfn.IChainable {
    return new sfn.Succeed(scope, 'TODO');
  }
}
