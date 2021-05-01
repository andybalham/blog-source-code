/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import { StateMachineProps } from '@aws-cdk/aws-stepfunctions';

export interface StateMachineWithGraphProps extends Omit<StateMachineProps, 'definition'> {
  getDefinition: (scope: cdk.Construct) => sfn.IChainable;
}

export default class StateMachineWithGraph extends sfn.StateMachine {
  //
  readonly graphJson: string;

  constructor(scope: cdk.Construct, id: string, props: StateMachineWithGraphProps) {
    //
    super(scope, id, {
      ...props,
      definition: props.getDefinition(scope),
    });

    const stateGraph = new sfn.StateGraph(
      props.getDefinition(new cdk.Stack()).startState,
      'Temporary graph to render to JSON'
    );

    this.graphJson = (stateGraph.toGraphJson() as unknown) as string;
  }
}
