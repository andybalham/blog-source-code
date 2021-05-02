/* eslint-disable no-new */
/* eslint-disable import/order */
// eslint-disable-next-line import/order
import TwentyQuestionsBuilderStack from '../deploy/TwentyQuestionsBuilderStack';
import cdk = require('@aws-cdk/core');

describe('StateMachineWithGraph', () => {
  // it('renders to graph JSON', async () => {
  //   //
  //   const stack = new cdk.Stack();

  //   const stateMachine = new StateMachineWithGraph(stack, 'Test', {
  //     definition: sfn.Chain.start(new sfn.Pass(stack, 'Pass')),
  //   });

  //   console.log(`stateMachine.graphJson: ${stateMachine.graphJson}`);
  // });

  // it('renders to graph JSON', async () => {
  //   //
  //   const stack = new cdk.Stack();

  //   const stateMachine = new StateMachineWithGraph(stack, 'Test', {
  //     getDefinition: (scope): sfn.IChainable => sfn.Chain.start(new sfn.Pass(scope, 'Pass')),
  //   });

  //   console.log(`stateMachine.graphJson: ${stateMachine.graphJson}`);

  //   /*
  //   First we get:
  //   stateMachine.graphJson: [object Object]

  //   Then:
  //   stateMachine.graphJson: {
  //     "StartAt": "Pass",
  //     "States": {
  //       "Pass": {
  //         "Type": "Pass",
  //         "End": true
  //       }
  //     }
  //   }
  //   */
  // });

  it('renders to graph JSON', async () => {
    //
    new TwentyQuestionsBuilderStack(new cdk.App(), 'Test');
  });
});
