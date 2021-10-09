/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3n from '@aws-cdk/aws-s3-notifications';
import * as sns from '@aws-cdk/aws-sns';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaEvents from '@aws-cdk/aws-lambda-event-sources';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import path from 'path';

export interface FileEventPublisherProps {
  deploymentTarget?: 'TEST' | 'PROD';
  fileBucket: s3.Bucket;
}

export default class FileEventPublisher extends cdk.Construct {
  //
  readonly fileEventTopic: sns.Topic;

  constructor(scope: cdk.Construct, id: string, props: FileEventPublisherProps) {
    super(scope, id);

    // The topic to which we publish file events

    this.fileEventTopic = new sns.Topic(this, `${id}FileEventTopic`, {
      displayName: `File event topic for ${props.fileBucket.bucketName}`,
    });

    // The table to hold the hashes of the files sections

    const fileHashesTable = new dynamodb.Table(this, 'FileHashesTable', {
      partitionKey: { name: 's3Key', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sectionType', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: props.deploymentTarget === 'TEST' ? cdk.RemovalPolicy.DESTROY : undefined,
    });

    // The function that is notified by the bucket and writes the hashes to the table

    const hashWriterFunction = this.newFunction('FileHashWriterFunction', 'fileHashWriter', {
      FILE_HASHES_TABLE_NAME: fileHashesTable.tableName,
    });

    props.fileBucket.grantRead(hashWriterFunction);
    props.fileBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(hashWriterFunction)
    );

    fileHashesTable.grantWriteData(hashWriterFunction);

    // The function to receive stream events from the hashes table and publish event to the topic

    const fileEventPublisherFunction = this.newFunction(
      'FileEventPublisherFunction',
      'fileEventPublisher',
      {
        FILE_EVENT_TOPIC_ARN: this.fileEventTopic.topicArn,
      }
    );

    fileEventPublisherFunction.addEventSource(
      new lambdaEvents.DynamoEventSource(fileHashesTable, {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      })
    );

    this.fileEventTopic.grantPublish(fileEventPublisherFunction);
  }

  private newFunction(
    functionId: string,
    functionModule: string,
    environment: Record<string, any>
  ): lambda.Function {
    //
    const functionEntryBase = path.join(__dirname, '..', '..', '..', 'src', 'functions');

    return new lambdaNodejs.NodejsFunction(this, functionId, {
      runtime: lambda.Runtime.NODEJS_12_X,
      entry: path.join(functionEntryBase, `${functionModule}.ts`),
      handler: 'handler',
      environment,
    });
  }
}
