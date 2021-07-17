/* eslint-disable import/no-extraneous-dependencies */
import StateMachineWithGraph from '@andybalham/state-machine-with-graph';
import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import * as fs from 'fs';
import path from 'path';
import { IntegrationTestStack } from '../../../aws-integration-test';
import { ResultCalculatorStateMachine } from '../../constructs';

export default class ResultCalculatorStateMachineTestStack extends IntegrationTestStack {
  //
  static readonly ResourceTagKey = 'ResultCalculatorStateMachineTestStack';

  static readonly StateMachineId = 'ResultCalculatorStateMachine';

  static readonly FileHeaderReaderMockId = 'FileHeaderReaderMock';

  static readonly FileHeaderIndexReaderMockId = 'FileHeaderIndexReaderMock';

  static readonly CombineHeadersMockId = 'CombineHeadersMock';

  static readonly ResultCalculatorObserverId = 'ResultCalculatorObserver';

  static readonly ErrorTopicObserverId = 'ErrorTopicObserver';

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testResourceTagKey: ResultCalculatorStateMachineTestStack.ResourceTagKey,
      observerFunctionIds: [
        ResultCalculatorStateMachineTestStack.ResultCalculatorObserverId,
        ResultCalculatorStateMachineTestStack.ErrorTopicObserverId,
      ],
    });

    // Mock functions

    const fileHeaderReaderMockFunction = this.newMockFunction(
      ResultCalculatorStateMachineTestStack.FileHeaderReaderMockId
    );

    const fileHeaderIndexReaderMockFunction = this.newMockFunction(
      ResultCalculatorStateMachineTestStack.FileHeaderIndexReaderMockId
    );

    const combineHeadersFunctionMockFunction = this.newMockFunction(
      ResultCalculatorStateMachineTestStack.CombineHeadersMockId
    );

    // Test error topic and observer

    const testErrorTopic = new sns.Topic(this, 'TestErrorTopic', {});

    testErrorTopic.addSubscription(
      new snsSubs.LambdaSubscription(
        this.observerFunctions[ResultCalculatorStateMachineTestStack.ErrorTopicObserverId]
      )
    );

    // System under test

    const sut = new ResultCalculatorStateMachine(
      this,
      ResultCalculatorStateMachineTestStack.StateMachineId,
      {
        fileHeaderReaderFunction: fileHeaderReaderMockFunction,
        fileHeaderIndexReaderFunction: fileHeaderIndexReaderMockFunction,
        combineHeadersFunction: combineHeadersFunctionMockFunction,
        calculateResultFunction:
          this.observerFunctions[ResultCalculatorStateMachineTestStack.ResultCalculatorObserverId],
        errorTopic: testErrorTopic,
      }
    );

    this.addTestResourceTag(sut, ResultCalculatorStateMachineTestStack.StateMachineId);

    // Output the graph JSON to help with development
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
