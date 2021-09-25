/* eslint-disable no-new */
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as sns from '@aws-cdk/aws-sns';
import { AsyncTask, Orchestrator } from '../../../src';
import {
  PublishResultRequest,
  PublishResultHandler,
} from './PublishResult.PublishResultHandler';

export default class PublishResult extends AsyncTask<PublishResultRequest, void> {
  //
  readonly resultTopic: sns.Topic;

  constructor(orchestrator: Orchestrator, id: string) {
    super(orchestrator, id, {
      handlerType: PublishResultHandler,
      handlerFunction: new lambdaNodejs.NodejsFunction(orchestrator, PublishResultHandler.name),
    });

    this.resultTopic = new sns.Topic(this, 'ResultTopic');

    this.resultTopic.grantPublish(this.handlerFunction);
    this.handlerFunction.addEnvironment(
      PublishResultHandler.EnvVars.ResultTopicArn,
      this.resultTopic.topicArn
    );
  }
}
