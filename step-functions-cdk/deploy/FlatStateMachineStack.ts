/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable import/prefer-default-export */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-new */
/* eslint-disable max-classes-per-file */
import * as cdk from '@aws-cdk/core';
import sfn = require('@aws-cdk/aws-stepfunctions');

export class FlatStateMachineStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    const performIdentityCheck = new sfn.Pass(this, 'Id1');
    const aggregateIdentityResults = new sfn.Pass(this, 'Id1');
    const overallIdentityResultIsFalse = sfn.Condition.booleanEquals(
      '$.overallIdentityResult',
      false
    );

    const performAffordabilityCheck = new sfn.Pass(this, 'Id1');
    const affordabilityResultIsBad = sfn.Condition.stringEquals('$.affordabilityResult', 'BAD');
    const affordabilityResultIsPoor = sfn.Condition.stringEquals('$.affordabilityResult', 'POOR');

    const sendAcceptEmail = new sfn.Pass(this, 'Id2');
    const sendReferEmail = new sfn.Pass(this, 'Id2');
    const notifyUnderwriter = new sfn.Pass(this, 'Id2');
    const sendDeclineEmail = new sfn.Pass(this, 'Id3');

    const processApplicationStateMachine = new sfn.StateMachine(
      this,
      'ProcessApplicationStateMachine',
      {
        definition: new StateMachineBuilder()

          .map('PerformIdentityChecks', {
            inputPath: '$.application',
            itemsPath: '$.applicants',
            resultPath: '$.identityResults',
            iterator: new StateMachineBuilder().perform(performIdentityCheck),
          })
          .perform(aggregateIdentityResults)

          .choice('EvaluateIdentityResults', {
            choices: [{ when: overallIdentityResultIsFalse, goto: 'PerformDeclineTasks' }],
          })

          .perform(performAffordabilityCheck)

          .choice('EvaluateAffordabilityCheck', {
            choices: [
              { when: affordabilityResultIsBad, goto: 'PerformDeclineTasks' },
              { when: affordabilityResultIsPoor, goto: 'PerformReferTasks' },
            ],
          })

          .parallel('PerformAcceptTasks', {
            branches: [new StateMachineBuilder().perform(sendAcceptEmail)],
          })
          .end()

          .parallel('PerformReferTasks', {
            branches: [
              new StateMachineBuilder().perform(sendReferEmail),
              new StateMachineBuilder().perform(notifyUnderwriter),
            ],
          })
          .end()

          .parallel('PerformDeclineTasks', {
            branches: [new StateMachineBuilder().perform(sendDeclineEmail)],
          })
          .end()

          .build(this),
      }
    );
  }
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

class StateMachineBuilder {
  // TODO 18Apr21: The following will need to store the details for each method, e.g. id & props
  private readonly allStates = new Array<sfn.State>();

  perform(state: sfn.State): StateMachineBuilder {
    this.allStates.push(state);
    return this;
  }

  map(id: string, props: PerformMapProps): StateMachineBuilder {
    return this;
  }

  parallel(id: string, props: PerformParallelProps): StateMachineBuilder {
    return this;
  }

  choice(id: string, props: EvaluateChoiceProps): StateMachineBuilder {
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

  // eslint-disable-next-line class-methods-use-this
  build(scope: cdk.Construct): sfn.IChainable {
    throw new Error(`Not implemented yet`);
  }
}
