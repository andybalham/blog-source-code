/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3n from '@aws-cdk/aws-s3-notifications';
import * as sns from '@aws-cdk/aws-sns';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaEvents from '@aws-cdk/aws-lambda-event-sources';
import * as dynamodb from '@aws-cdk/aws-dynamodb';

export interface FileEventPublisherProps {
  bucket: s3.Bucket;
}

export default class FileEventPublisher extends cdk.Construct {
  readonly fileEventTopic: sns.Topic;

  constructor(scope: cdk.Construct, id: string, props: FileEventPublisherProps) {
    super(scope, id);

    const hashesTable = new dynamodb.Table(this, 'HashesTable', {
      partitionKey: { name: 's3Key', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'contentType', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // TODO 06Jun21: Implement HashWriterFunction
    const hashWriterFunction = new lambda.Function(this, 'HashWriterFunction', {
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromInline(
        `exports.handler = (event) => { console.log(JSON.stringify(event)); }`
      ),
      environment: {
        HASHES_TABLE_NAME: hashesTable.tableName,
      },
    });

    hashesTable.grantWriteData(hashWriterFunction);

    props.bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(hashWriterFunction)
    );

    this.fileEventTopic = new sns.Topic(this, `${id}FileEventTopic`, {
      displayName: `File event topic for ${props.bucket.bucketName}`,
    });

    // TODO 06Jun21: Implement EventPublisherFunction
    const eventPublisherFunction = new lambda.Function(this, 'EventPublisherFunction', {
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromInline(
        `exports.handler = (event) => { console.log(JSON.stringify(event)); }`
      ),
      environment: {
        FILE_EVENT_TOPIC_ARN: this.fileEventTopic.topicArn,
      },
    });

    eventPublisherFunction.addEventSource(
      new lambdaEvents.DynamoEventSource(hashesTable, {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      })
    );

    this.fileEventTopic.grantPublish(eventPublisherFunction);
  }
}
