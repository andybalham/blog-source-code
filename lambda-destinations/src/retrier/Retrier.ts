/* eslint-disable import/no-extraneous-dependencies */
import * as sqs from '@aws-cdk/aws-sqs';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as lambdaEventSources from '@aws-cdk/aws-lambda-event-sources';
import { MAX_RETRY_COUNT_ENV_VAR, RETRY_QUEUE_URL_ENV_VAR } from './Retrier.QueueRetriesFunction';
import { INPUT_FUNCTION_NAME_ENV_VAR } from './Retrier.RetryFunction';

export interface RetrierProps {
  failureQueue: sqs.IQueue;
  retryFunction: lambda.IFunction;
}
export default class Retrier extends cdk.Construct {
  //
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(scope: cdk.Construct, id: string, props: RetrierProps) {
    super(scope, id);

    // Retry queue

    const retryQueue = new sqs.Queue(this, 'RetryQueue', {
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      visibilityTimeout: cdk.Duration.seconds(3),
    });

    // Queue retries function

    const queueRetriesFunction = new lambdaNodejs.NodejsFunction(scope, 'QueueRetriesFunction', {
      // Does being on a queue count as being called asynchronously?
      // No, see https://aws.amazon.com/blogs/compute/introducing-aws-lambda-destinations/
      // onSuccess: new lambdaDestinations.SqsDestination(retryQueue),
      description: 'Queues up the requests to be retried',
      environment: {
        [RETRY_QUEUE_URL_ENV_VAR]: retryQueue.queueUrl,
        [MAX_RETRY_COUNT_ENV_VAR]: '3',
      },
      retryAttempts: 0,
    });

    props.failureQueue.grantConsumeMessages(queueRetriesFunction);

    queueRetriesFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(props.failureQueue, {
        enabled: true,
        batchSize: 1,
      })
    );

    retryQueue.grantSendMessages(queueRetriesFunction);

    // Retry function

    const retryFunction = new lambdaNodejs.NodejsFunction(scope, 'RetryFunction', {
      description: 'Retries the queued requests',
      environment: {
        [INPUT_FUNCTION_NAME_ENV_VAR]: props.retryFunction.functionName,
      },
      retryAttempts: 0,
    });

    retryQueue.grantConsumeMessages(retryFunction);

    retryFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(retryQueue, {
        enabled: false,
        batchSize: 1,
      })
    );

    props.retryFunction.grantInvoke(retryFunction);
  }
}
