/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import * as s3 from '@aws-cdk/aws-s3';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sqs from '@aws-cdk/aws-sqs';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import * as lambdaEventSources from '@aws-cdk/aws-lambda-event-sources';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { FileSectionType } from '../../contracts/FileSectionType';
import { newNodejsFunction } from '../common';

export interface FileHeaderIndexerProps {
  deploymentTarget?: 'TEST' | 'PROD';
  fileEventTopic: sns.Topic;
  fileBucket: s3.Bucket;
}
export default class FileHeaderIndexer extends cdk.Construct {
  //
  readonly readerFunction: lambda.IFunction;

  static readonly TableId = 'HeaderIndexTable';

  static readonly ReaderFunctionId = 'HeaderIndexReaderFunction';

  static readonly BucketId = 'HeaderIndexBucket';

  constructor(scope: cdk.Construct, id: string, props: FileHeaderIndexerProps) {
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

    // Header table

    const fileHeadersTable = new dynamodb.Table(this, 'FileHeadersTable', {
      partitionKey: { name: 'fileType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 's3Key', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.deploymentTarget === 'TEST' ? cdk.RemovalPolicy.DESTROY : undefined,
    });

    // Attach the lambda to process the events

    const writerFunction = newNodejsFunction(
      this,
      'HeaderIndexWriterFunction',
      'headerIndexWriter',
      {
        HEADERS_TABLE_NAME: fileHeadersTable.tableName,
        FILE_BUCKET_NAME: props.fileBucket.bucketName,
      }
    );

    writerFunction.addEventSource(new lambdaEventSources.SqsEventSource(headerUpdatesQueue));

    headerUpdatesQueue.grantConsumeMessages(writerFunction);
    props.fileBucket.grantRead(writerFunction);
    fileHeadersTable.grantWriteData(writerFunction);

    // Lambda to read from the table

    this.readerFunction = newNodejsFunction(
      this,
      FileHeaderIndexer.ReaderFunctionId,
      'headerIndexReader',
      {
        HEADERS_TABLE_NAME: fileHeadersTable.tableName,
      }
    );

    fileHeadersTable.grantReadData(this.readerFunction);
  }
}
