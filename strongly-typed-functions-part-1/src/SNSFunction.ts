/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
// TODO 28Feb21: Include this in code coverage
/* istanbul ignore file */
import { SNSEvent, SNSEventRecord } from 'aws-lambda/trigger/sns';
import BaseFunction from './BaseFunction';

export interface SNSFunctionProps {
  // Handling errors allows us to shortcut the following: https://docs.aws.amazon.com/sns/latest/dg/sns-message-delivery-retries.html
  errorHandler?: (
    error: any,
    event: SNSEvent,
    eventRecord: SNSEventRecord
  ) => Promise<void>;
}

export default abstract class SNSFunction<T> extends BaseFunction<
  SNSEvent,
  PromiseSettledResult<void>[]
> {
  //
  props: SNSFunctionProps = {
    errorHandler: async (error) => console.error(error.Message),
  };

  constructor(props?: SNSFunctionProps) {
    super();
    this.props = { ...this.props, ...props };
  }

  protected async handleInternalAsync(
    event: SNSEvent
  ): Promise<PromiseSettledResult<void>[]> {
    const recordPromises = event.Records.map((record) =>
      this.handleRecordAsync(event, record)
    );
    return Promise.allSettled(recordPromises);
  }

  private async handleRecordAsync(
    event: SNSEvent,
    eventRecord: SNSEventRecord
  ): Promise<void> {
    //
    const message = JSON.parse(eventRecord.Sns.Message);

    if (this.props.errorHandler) {
      try {
        //
        await this.handleMessageAsync(message);
        //
      } catch (error) {
        try {
          await this.handleErrorAsync(error, message, eventRecord, event);
        } catch (errorHandlingError) {
          this.logError(
            'Error handling error',
            { eventRecord, event },
            errorHandlingError
          );
        }
      }
    } else {
      //
      await this.handleMessageAsync(message);
      //
    }
  }

  abstract handleMessageAsync(message: T): Promise<void>;

  async handleErrorAsync(
    error: any,
    message: T,
    eventRecord: SNSEventRecord,
    event: SNSEvent
  ): Promise<void> {
    this.logError(
      'Error handling message',
      { message, event, eventRecord },
      error
    );
  }
}
