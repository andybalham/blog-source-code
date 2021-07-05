/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sqs from '@aws-cdk/aws-sqs';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import * as lambdaEventSources from '@aws-cdk/aws-lambda-event-sources';
import { FileSectionType } from '../../contracts/FileSectionType';
import { newNodejsFunction } from '../common';

export interface HeaderIndexProps {
  fileEventTopic: sns.Topic;
}
export default class HeaderIndex extends cdk.Construct {
  //
  readonly readerFunction: lambda.IFunction;

  static readonly ReaderFunctionId = 'HeaderIndexReaderFunction';

  constructor(scope: cdk.Construct, id: string, props: HeaderIndexProps) {
    super(scope, id);

    // Subscribe the SQS queue to the SNS topic

    const headerUpdatesDLQ = new sqs.Queue(this, 'HeaderUpdatesDLQ', {
      receiveMessageWaitTime: cdk.Duration.seconds(20),
    });

    const headerUpdatesQueue = new sqs.Queue(this, 'HeaderUpdatesQueue', {
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      visibilityTimeout: cdk.Duration.seconds(3),
      deadLetterQueue: {
        maxReceiveCount: 1,
        queue: headerUpdatesDLQ,
      },
    });

    props.fileEventTopic.addSubscription(
      new snsSubs.SqsSubscription(headerUpdatesQueue, {
        rawMessageDelivery: true,
        filterPolicy: {
          sectionType: sns.SubscriptionFilter.stringFilter({ allowlist: [FileSectionType.Header] }),
        },
      })
    );

    // TODO 04Jul21: Header table

    // Attach the lambda to process the events

    const writerFunction = newNodejsFunction(
      this,
      'HeaderIndexWriterFunction',
      'headerIndexWriter',
      {
        // TODO 04Jul21: Will need the name of the header table
      }
    );

    writerFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(headerUpdatesQueue)
    );

    headerUpdatesQueue.grantConsumeMessages(writerFunction);

    // Lambda to read from the table

    this.readerFunction = newNodejsFunction(
      this,
      HeaderIndex.ReaderFunctionId,
      'headerIndexReader',
      {
        // TODO 04Jul21: Will need the name of the header table
      }
    );
  }
}
