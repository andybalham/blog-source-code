/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as cdkSns from '@aws-cdk/aws-sns';
import { SNS } from 'aws-sdk';
import { PublishInput, PublishResponse } from 'aws-sdk/clients/sns';
import * as lambda from '@aws-cdk/aws-lambda';
import SelfDeployService, { SelfDeployServiceType } from './SelfDeployService';

const sns = new SNS();

export default class SelfDeployTopic extends SelfDeployService {
  //
  topic: cdkSns.Topic;

  constructor(public id: string) {
    super();
  }

  async publishAsync(input: PublishInput): Promise<void> {
    const topicArn = process.env[this.getEnvVarName()];
    if (topicArn === undefined) throw new Error('topicArn === undefined');
    await this.publishAsyncInternal(topicArn, input);
  }

  private getEnvVarName(): string {
    return `service_${this.id}_topic_arn`.toUpperCase();
  }

  addConfiguration(cdkFunction: lambda.Function): void {
    if (this.topic === undefined) throw new Error('this.topic === undefined');
    this.topic.grantPublish(cdkFunction);
    cdkFunction.addEnvironment(this.getEnvVarName(), this.topic.topicArn);
  }

  getType(): SelfDeployServiceType {
    return SelfDeployServiceType.Topic;
  }

  newConstruct(scope: cdk.Construct): cdkSns.ITopic {
    this.topic = new cdkSns.Topic(scope, this.id, this.getTopicProps());
    return this.topic;
  }

  getTopicProps(): cdkSns.TopicProps {
    return {};
  }

  private async publishAsyncInternal(
    topicArn: string,
    input: PublishInput
  ): Promise<PublishResponse> {
    const augmentedInput: PublishInput = {
      ...input,
      TopicArn: topicArn,
    };

    return sns.publish(augmentedInput).promise();
  }
}
