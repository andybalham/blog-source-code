/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import { Orchestrator, OrchestratorProps } from '../../src';
import AddTwoNumbersTask from './AddTwoNumbersTask';
import LambdaTaskHandler from '../../src/LambdaTaskHandler';

export type SimpleSequenceProps = Omit<OrchestratorProps, 'handlerFunction'>;

export default class SimpleSequence extends Orchestrator {
  //
  constructor(scope: cdk.Construct, id: string, props: SimpleSequenceProps) {
    super(scope, id, {
      ...props,
      handlerFunction: new lambdaNodejs.NodejsFunction(scope, 'handler'),
    });

    new AddTwoNumbersTask(this, AddTwoNumbersTask.name, {
      eventTopic: this.eventTopic,
      handlerFunction: new lambdaNodejs.NodejsFunction(this, 'addTwoNumbersHandler', {
        environment: {
          // TODO 11Sep21: This could be a default
          [LambdaTaskHandler.Env.EVENT_TOPIC_ARN]: this.eventTopic.topicArn,
        },
      }),
    });
  }
}
