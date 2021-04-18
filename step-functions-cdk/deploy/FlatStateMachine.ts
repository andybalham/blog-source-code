/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable import/prefer-default-export */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-new */
/* eslint-disable max-classes-per-file */
import * as cdk from '@aws-cdk/core';
import sfn = require('@aws-cdk/aws-stepfunctions');

export class FlatStateMachine extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string) {
    //
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

    new StateMachineBuilder()

      .performMap('PerformIdentityChecks', {
        inputPath: '$.application',
        itemsPath: '$.applicants',
        resultPath: '$.identityResults',
        iterator: new StateMachineBuilder().perform('PerformIdentityCheck', performIdentityCheck),
      })
      .perform('AggregateIdentityResults', aggregateIdentityResults)

      .choice('EvaluateIdentityResults', (cases) =>
        cases.when(overallIdentityResultIsFalse).goto('PerformDeclineTasks')
      )

      .perform('AffordabilityCheck', performAffordabilityCheck)

      .choice('EvaluateAffordabilityCheck', (cases) =>
        cases
          .when(affordabilityResultIsBad)
          .goto('PerformDeclineTasks')
          .when(affordabilityResultIsPoor)
          .goto('PerformReferTasks')
      )

      .performInParallel('PerformAcceptTasks', {
        branches: [new StateMachineBuilder().perform('SendAcceptEmail', sendAcceptEmail)],
      })
      .end()

      .performInParallel('PerformReferTasks', {
        branches: [
          new StateMachineBuilder().perform('SendReferEmail', sendReferEmail),
          new StateMachineBuilder().perform('NotifyUnderwriter', notifyUnderwriter),
        ],
      })
      .end()

      .performInParallel('PerformDeclineTasks', {
        branches: [new StateMachineBuilder().perform('SendDeclineEmail', sendDeclineEmail)],
      })
      .end()

      .build(this);
  }
}

interface PerformChoiceProps extends sfn.ChoiceProps {
  iterator: StateMachineBuilder;
}

interface PerformMapProps extends sfn.MapProps {
  iterator: StateMachineBuilder;
}

interface PerformParallelProps extends sfn.ParallelProps {
  branches: StateMachineBuilder[];
}

class StateMachineBuilder {
  perform(name: string, state: sfn.State): StateMachineBuilder {
    return this;
  }

  performMap(name: string, props: PerformMapProps): StateMachineBuilder {
    return this;
  }

  performInParallel(name: string, props: PerformParallelProps): StateMachineBuilder {
    return this;
  }

  // eslint-disable-next-line class-methods-use-this
  choice(name: string, cases: any): StateMachineBuilder {
    throw new Error(`Not implemented yet`);
  }

  // eslint-disable-next-line class-methods-use-this
  end(): StateMachineBuilder {
    throw new Error(`Not implemented yet`);
  }

  // eslint-disable-next-line class-methods-use-this
  build(scope: cdk.Construct): sfn.IChainable {
    throw new Error(`Not implemented yet`);
  }
}
