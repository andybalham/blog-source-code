/* eslint-disable import/no-extraneous-dependencies */
import StateMachineWithGraph from '@andybalham/state-machine-with-graph';
import * as cdk from '@aws-cdk/core';
import * as fs from 'fs';
import path from 'path';
import { IntegrationTestStack } from '../../../aws-integration-test';
import { ResultCalculatorStateMachine } from '../../constructs';

export default class ResultCalculatorStateMachineTestStack extends IntegrationTestStack {
  //
  static readonly ResourceTagKey = 'ResultCalculatorStateMachineTestStack';

  static readonly StateMachineId = 'ResultCalculatorStateMachine';

  static readonly FileHeaderReaderMockId = 'FileHeaderReader';

  static readonly FileHeaderIndexReaderMockId = 'FileHeaderIndexReader';

  static readonly CombineHeadersMockId = 'CombineHeaders';

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testResourceTagKey: ResultCalculatorStateMachineTestStack.ResourceTagKey,
      deployIntegrationTestTable: true,
      deployTestObserverFunction: true,
    });

    const fileHeaderReaderMockFunction = this.newMockFunction(
      ResultCalculatorStateMachineTestStack.FileHeaderReaderMockId
    );

    const fileHeaderIndexReaderMockFunction = this.newMockFunction(
      ResultCalculatorStateMachineTestStack.FileHeaderIndexReaderMockId
    );

    const combineHeadersFunctionMockFunction = this.newMockFunction('CombineHeaders');

    const sut = new ResultCalculatorStateMachine(
      this,
      ResultCalculatorStateMachineTestStack.StateMachineId,
      {
        fileHeaderReaderFunction: fileHeaderReaderMockFunction,
        fileHeaderIndexReaderFunction: fileHeaderIndexReaderMockFunction,
        combineHeadersFunction: combineHeadersFunctionMockFunction,
        calculateResultFunction: this.testObserverFunction,
      }
    );

    this.addTestResourceTag(sut, ResultCalculatorStateMachineTestStack.StateMachineId);

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    writeGraphJson(sut);
  }
}

function writeGraphJson(stateMachine: StateMachineWithGraph): void {
  //
  const stateMachinePath = path.join(__dirname, 'stateMachines');

  if (!fs.existsSync(stateMachinePath)) fs.mkdirSync(stateMachinePath);

  fs.writeFileSync(
    path.join(stateMachinePath, `${stateMachine.node.id}.asl.json`),
    stateMachine.graphJson
  );
}
