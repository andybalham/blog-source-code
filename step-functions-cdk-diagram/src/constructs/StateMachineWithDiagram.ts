/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import { StateMachineProps } from '@aws-cdk/aws-stepfunctions';
import * as fs from 'fs';
import * as path from 'path';
import sfn = require('@aws-cdk/aws-stepfunctions');

export interface StateMachineWithDiagramProps extends Omit<StateMachineProps, 'definition'> {
  getDefinition: (scope: cdk.Construct) => sfn.IChainable;
}

export default class StateMachineWithDiagram extends sfn.StateMachine {
  //
  constructor(scope: cdk.Construct, id: string, props: StateMachineWithDiagramProps) {
    //
    super(scope, id, {
      ...props,
      definition: props.getDefinition(scope),
    });

    const stateGraph = new sfn.StateGraph(
      props.getDefinition(new cdk.Stack()).startState,
      'Temporary graph to render to JSON'
    );

    const stateMachinePath = path.join(__dirname, 'stateMachines');

    if (!fs.existsSync(stateMachinePath)) fs.mkdirSync(stateMachinePath);

    fs.writeFileSync(
      path.join(stateMachinePath, `${id}.asl.json`),
      JSON.stringify(stateGraph.toGraphJson(), null, 2)
    );
  }
}
