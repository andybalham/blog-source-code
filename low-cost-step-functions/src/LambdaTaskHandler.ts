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
    REQUEST_TOPIC_ARN: 'REQUEST_TOPIC_ARN',
  };

  static readonly eventTopicArn = process.env[LambdaTaskHandler.Env.REQUEST_TOPIC_ARN];

  async handleAsync(event: SNSEvent): Promise<void> {
    //
    console.log(JSON.stringify({ event }, null, 2));

    if (LambdaTaskHandler.eventTopicArn === undefined)
      throw new Error('LambdaTaskHandler.eventTopicArn === undefined');

    const requests = event.Records.map((r) => JSON.parse(r.Sns.Message) as LambdaInvokeRequest);

    for await (const request of requests) {
      //
      try {
        const responsePayload = await this.handleRequestAsync(request.payload as TReq);

        const lambdaInvokeResponse: LambdaInvokeResponse = {
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
        //
      } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error(`${error.stack}\n\nError handling request: ${JSON.stringify(request)}`);
      }
    }
  }

  abstract handleRequestAsync(request: TReq): Promise<TRes>;
}
