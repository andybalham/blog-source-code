/* eslint-disable no-new */
/* eslint-disable import/order */
// eslint-disable-next-line import/order
import TwentyQuestionsBuilderStack from '../deploy/TwentyQuestionsBuilderStack';
import { StateMachineWithGraph } from '../src/constructs';
import { writeGraphJson } from '../deploy/utils';
import StateMachineBuilder from '../src/constructs/StateMachineBuilder-Design';
import cdk = require('@aws-cdk/core');
import sfn = require('@aws-cdk/aws-stepfunctions');

describe('StateMachineWithGraph', () => {
  //
  it.skip('renders Twenty Questions', async () => {
    new TwentyQuestionsBuilderStack(new cdk.App(), 'Test');
  });

  it.skip('renders simple chain', async () => {
    //
    const cdkStack = new cdk.Stack();

    const cdkStateMachine = new StateMachineWithGraph(cdkStack, 'SimpleChain-CDK', {
      getDefinition: (definitionScope): sfn.IChainable => {
        //
        const state1 = new sfn.Pass(definitionScope, 'State1');
        const state2 = new sfn.Pass(definitionScope, 'State2');
        const state3 = new sfn.Pass(definitionScope, 'State3');
        const state4 = new sfn.Pass(definitionScope, 'State4');
        const state5 = new sfn.Pass(definitionScope, 'State5');
        const state6 = new sfn.Pass(definitionScope, 'State6');

        return sfn.Chain.start(
          state1.next(state2.next(state3.next(state4.next(state5.next(state6)))))
        );
      },
    });

    writeGraphJson(cdkStateMachine);

    const builderStack = new cdk.Stack();

    const builderStateMachine = new StateMachineWithGraph(builderStack, 'SimpleChain-Builder', {
      getDefinition: (definitionScope): sfn.IChainable => {
        //
        const state1 = new sfn.Pass(definitionScope, 'State1');
        const state2 = new sfn.Pass(definitionScope, 'State2');
        const state3 = new sfn.Pass(definitionScope, 'State3');
        const state4 = new sfn.Pass(definitionScope, 'State4');
        const state5 = new sfn.Pass(definitionScope, 'State5');
        const state6 = new sfn.Pass(definitionScope, 'State6');

        return new StateMachineBuilder()
          .perform(state1)
          .perform(state2)
          .perform(state3)
          .perform(state4)
          .perform(state5)
          .perform(state6)
          .build(definitionScope);
      },
    });

    writeGraphJson(builderStateMachine);
  });

  it('renders multiple choices', async () => {
    //
    const cdkStack = new cdk.Stack();

    const cdkStateMachine = new StateMachineWithGraph(cdkStack, 'MultipleChoice-CDK', {
      getDefinition: (definitionScope): sfn.IChainable => {
        //
        const state1 = new sfn.Pass(definitionScope, 'State1');
        const state2 = new sfn.Pass(definitionScope, 'State2');
        const state3 = new sfn.Pass(definitionScope, 'State3');
        const state4 = new sfn.Pass(definitionScope, 'State4');

        return sfn.Chain.start(
          new sfn.Choice(definitionScope, 'Choice1')
            .when(
              sfn.Condition.booleanEquals('$.var1', true),
              new sfn.Choice(definitionScope, 'Choice2')
                .when(sfn.Condition.booleanEquals('$.var2', true), state1)
                .otherwise(state2)
            )
            .otherwise(
              new sfn.Choice(definitionScope, 'Choice3')
                .when(sfn.Condition.booleanEquals('$.var2', true), state3)
                .otherwise(state4)
            )
        );
      },
    });

    writeGraphJson(cdkStateMachine);

    const builderStack = new cdk.Stack();

    const builderStateMachine = new StateMachineWithGraph(builderStack, 'MultipleChoice-Builder', {
      getDefinition: (definitionScope): sfn.IChainable => {
        //
        const state1 = new sfn.Pass(definitionScope, 'State1');
        const state2 = new sfn.Pass(definitionScope, 'State2');
        const state3 = new sfn.Pass(definitionScope, 'State3');
        const state4 = new sfn.Pass(definitionScope, 'State4');

        return new StateMachineBuilder()

          .choice('Choice1', {
            choices: [{ when: sfn.Condition.booleanEquals('$.var1', true), next: 'Choice2' }],
            otherwise: 'Choice3',
          })

          .choice('Choice2', {
            choices: [{ when: sfn.Condition.booleanEquals('$.var2', true), next: 'State1' }],
            otherwise: 'State2',
          })

          .choice('Choice3', {
            choices: [{ when: sfn.Condition.booleanEquals('$.var3', true), next: 'Choice3' }],
            otherwise: 'Choice4',
          })

          .perform(state1, { end: true })
          .perform(state2, { end: true })
          .perform(state3, { end: true })
          .perform(state4, { end: true })

          .build(definitionScope);
      },
    });

    writeGraphJson(builderStateMachine);
  });
});
