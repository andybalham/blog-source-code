/* eslint-disable indent */
/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as cdkSns from '@aws-cdk/aws-sns';
import AWS from 'aws-sdk';
import { PublishInput, PublishResponse } from 'aws-sdk/clients/sns';
import * as lambda from '@aws-cdk/aws-lambda';
import SelfDeployService from './SelfDeployService';

export default class SelfDeployTopic
  implements SelfDeployService<cdkSns.ITopic, cdkSns.TopicProps>
{
  //
  private topic: cdkSns.Topic;

  readonly client: AWS.SNS;

  constructor(public id: string) {
    this.client = new AWS.SNS();
  }

  async publishAsync(input: PublishInput): Promise<PublishResponse> {
    const topicArn = this.getArn();

    const augmentedInput: PublishInput = {
      ...input,
      TopicArn: topicArn,
    };

    return this.client.publish(augmentedInput).promise();
  }

  getArn(): string {
    const topicArn = process.env[this.getEnvVarName()];
    if (topicArn === undefined) throw new Error('topicArn === undefined');
    return topicArn;
  }

  configureFunction(cdkFunction: lambda.Function): void {
    if (this.topic === undefined) throw new Error('this.topic === undefined');
    this.topic.grantPublish(cdkFunction);
    cdkFunction.addEnvironment(this.getEnvVarName(), this.topic.topicArn);
  }

  newConstruct(scope: cdk.Construct, props?: cdkSns.TopicProps): cdkSns.ITopic {
    this.topic = new cdkSns.Topic(scope, this.id, {
      ...this.getTopicProps(),
      ...props,
    });
    return this.topic;
  }

  getTopicProps(): cdkSns.TopicProps {
    return {};
  }

  private getEnvVarName(): string {
    return `service_${this.id}_topic_arn`.toUpperCase();
  }
}
