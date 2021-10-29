/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as subs from '@aws-cdk/aws-sns-subscriptions';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { FileEventPublisher } from '../../constructs';
import { newNodejsFunction } from '../../common';

export default class FileEventPublisherTestStack extends cdk.Stack {
  //
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

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
      new subs.LambdaSubscription(fileEventTestSubscriberFunction)
    );
    testResultsTable.grantWriteData(fileEventTestSubscriberFunction);

    // Output the names of the test bucket and the results table
    
    new cdk.CfnOutput(this, `TestBucketName`, {
      value: testBucket.bucketName,
    });

    new cdk.CfnOutput(this, `TestResultsTableName`, {
      value: testResultsTable.tableName,
    });
  }
}
