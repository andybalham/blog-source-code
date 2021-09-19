/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
/* eslint-disable class-methods-use-this */
import { SNSEvent } from 'aws-lambda/trigger/sns';
// eslint-disable-next-line import/no-extraneous-dependencies
import SNS, { PublishInput } from 'aws-sdk/clients/sns';
import { AsyncTaskRequest, AsyncTaskResponse } from './exchanges/AsyncTaskExchange';
import Orchestrator from './Orchestrator';
import { TaskHandler } from './TaskHandler';

const sns = new SNS();

export default abstract class AsyncTaskHandler<TReq, TRes> implements TaskHandler<TReq, TRes> {
  //
  static readonly responseTopicArn = process.env[Orchestrator.EnvVars.RESPONSE_TOPIC_ARN];

  async handleAsync(event: SNSEvent): Promise<void> {
    //
    try {
      console.log(JSON.stringify({ event }, null, 2));

      if (AsyncTaskHandler.responseTopicArn === undefined)
        throw new Error('AsyncTaskHandler.responseTopicArn === undefined');

      const requests = event.Records.map((r) => JSON.parse(r.Sns.Message) as AsyncTaskRequest);

      for await (const request of requests) {
        //
        try {
          const responsePayload = await this.handleRequestAsync(request.payload as TReq);

          const asyncTaskResponse: AsyncTaskResponse = {
            isAsyncTaskResponse: null,
            executionId: request.executionId,
            messageId: request.messageId,
            payload: responsePayload,
          };

          const responsePublishInput: PublishInput = {
            TopicArn: AsyncTaskHandler.responseTopicArn,
            Message: JSON.stringify(asyncTaskResponse),
          };

          console.log(JSON.stringify({ responsePublishInput }, null, 2));

          await sns.publish(responsePublishInput).promise();
          //
        } catch (error: any) {
          console.error(`${error.stack}\n\nError handling request: ${JSON.stringify(request)}`);
        }
      }
    } catch (error: any) {
      console.error(`${error.stack}\n\nError handling event: ${JSON.stringify(event)}`);
    }
  }

  abstract handleRequestAsync(request: TReq): Promise<TRes>;
}
