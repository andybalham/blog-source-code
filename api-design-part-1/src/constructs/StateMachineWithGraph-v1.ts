/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sfn from '@aws-cdk/aws-stepfunctions';

/*
Error: Trying to use state 'Pass' in Temporary graph to render to JSON (Pass), but is already in State Machine Test definition (Pass). Every state can only be used in one graph.
*/

export default class StateMachineWithGraph extends sfn.StateMachine {
  //
  readonly graphJson: string;

  constructor(scope: cdk.Construct, id: string, props: sfn.StateMachineProps) {
    //
    super(scope, id, props);

    const stateGraph = new sfn.StateGraph(
      props.definition.startState,
      'Temporary graph to render to JSON'
    );

    this.graphJson = (stateGraph.toGraphJson() as unknown) as string;
  }
}
