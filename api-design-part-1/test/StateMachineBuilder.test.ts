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

  it('renders simple chain', async () => {
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
});
