/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as subscriptions from '@aws-cdk/aws-sns-subscriptions';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { FileEventPublisher } from '../../constructs';
import { newNodejsFunction } from '../../common';

export default class FileEventPublisherTestStack extends cdk.Stack {
  //
  // The key for all testing tags
  static readonly ResourceKey = 'FileEventPublisherTestStack';

  // The tags for our test resources

  static readonly TestBucketTag = new cdk.Tag(
    FileEventPublisherTestStack.ResourceKey,
    'TestBucket'
  );

  static readonly TestResultsTableTag = new cdk.Tag(
    FileEventPublisherTestStack.ResourceKey,
    'TestResultsTable'
  );

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    // Create the test resources and the system under test
    
    const testBucket = new s3.Bucket(this, 'TestBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const sut = new FileEventPublisher(this, 'SUT', {
      fileBucket: testBucket,
    });

    const testResultsTable = new dynamodb.Table(this, 'TestResultsTable', {
      partitionKey: { name: 's3Key', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'messageId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const fileEventTestSubscriberFunction = newNodejsFunction(
      this,
      'FileEventTestSubscriberFunction',
      'fileEventTestSubscriber',
      {
        TEST_RESULTS_TABLE_NAME: testResultsTable.tableName,
      }
    );
    sut.fileEventTopic.addSubscription(
      new subscriptions.LambdaSubscription(fileEventTestSubscriberFunction)
    );
    testResultsTable.grantWriteData(fileEventTestSubscriberFunction);

    // Tag the resources we want to interact with

    cdk.Tags.of(testBucket).add(
      FileEventPublisherTestStack.TestBucketTag.key,
      FileEventPublisherTestStack.TestBucketTag.value
    );

    cdk.Tags.of(testResultsTable).add(
      FileEventPublisherTestStack.TestResultsTableTag.key,
      FileEventPublisherTestStack.TestResultsTableTag.value
    );
  }
}
