/* eslint-disable class-methods-use-this */
import SNS, { PublishInput } from 'aws-sdk/clients/sns';
import { AsyncTaskHandler } from '../../../src';

export interface PublishResultRequest {
  summary: string;
}

const sns = new SNS();

export class PublishResultTaskHandler extends AsyncTaskHandler<PublishResultRequest, void> {
  //
  static readonly EnvVars = {
    ResultTopicArn: 'RESULT_TOPIC_ARN',
  };

  async handleRequestAsync(request: PublishResultRequest): Promise<void> {
    //
    const resultPublishInput: PublishInput = {
      TopicArn: process.env[PublishResultTaskHandler.EnvVars.ResultTopicArn],
      Message: request.summary,
    };

    await sns.publish(resultPublishInput).promise();
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const handler = async (event: any): Promise<void> =>
  new PublishResultTaskHandler().handleAsync(event);
