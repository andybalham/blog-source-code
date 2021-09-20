/* eslint-disable no-new */
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as sns from '@aws-cdk/aws-sns';
import { AsyncTask, Orchestrator } from '../../../src';
import { PublishResultRequest, PublishResultTaskHandler } from './PublishResultTask.handler';

export default class PublishResultTask extends AsyncTask<PublishResultRequest, void> {
  //
  readonly resultTopic: sns.Topic;

  constructor(orchestrator: Orchestrator, id: string) {
    super(orchestrator, id, {
      handlerType: PublishResultTaskHandler,
      handlerFunction: new lambdaNodejs.NodejsFunction(orchestrator, 'handler'),
    });

    this.resultTopic = new sns.Topic(this, 'ResultTopic');

    this.handlerFunction.addEnvironment(
      PublishResultTaskHandler.EnvVars.ResultTopicArn,
      this.resultTopic.topicArn
    );
  }
}
