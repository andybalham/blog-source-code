/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
/* eslint-disable class-methods-use-this */
import { SNSEvent } from 'aws-lambda/trigger/sns';
// eslint-disable-next-line import/no-extraneous-dependencies
import SNS, { PublishInput } from 'aws-sdk/clients/sns';
import { LambdaInvokeRequest, LambdaInvokeResponse } from './exchanges/LambdaInvokeExchange';

const sns = new SNS();

export default abstract class LambdaTaskHandler<TReq, TRes> {
  //
  static readonly Env = {
    EVENT_TOPIC_ARN: 'EVENT_TOPIC_ARN',
  };

  static readonly eventTopicArn = process.env[LambdaTaskHandler.Env.EVENT_TOPIC_ARN];

  async handleAsync(event: SNSEvent): Promise<void> {
    //
    console.log(JSON.stringify({ event }, null, 2));

    if (LambdaTaskHandler.eventTopicArn === undefined)
      throw new Error('LambdaTaskHandler.eventTopicArn === undefined');

    const requests = event.Records.map((r) => JSON.parse(r.Sns.Message) as LambdaInvokeRequest);

    for await (const request of requests) {
      //
      // TODO 11Sep21: Error handling

      const responsePayload = await this.handleRequestAsync(request.payload as TReq);

      const lambdaInvokeResponse: LambdaInvokeResponse = {
        isLambdaInvokeResponse: null,
        executionId: request.executionId,
        messageId: request.messageId,
        payload: responsePayload,
      };

      const responsePublishInput: PublishInput = {
        TopicArn: LambdaTaskHandler.eventTopicArn,
        Message: JSON.stringify(lambdaInvokeResponse),
      };

      const responsePublishResponse = await sns.publish(responsePublishInput).promise();

      console.log(JSON.stringify({ responsePublishResponse }, null, 2));
    }
  }

  abstract handleRequestAsync(request: TReq): Promise<TRes>;
}
