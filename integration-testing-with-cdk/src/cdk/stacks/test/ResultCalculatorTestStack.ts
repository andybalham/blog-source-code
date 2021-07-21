/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3n from '@aws-cdk/aws-s3-notifications';
import * as sns from '@aws-cdk/aws-sns';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import { IntegrationTestStack } from '../../../aws-integration-test';
import { ResultCalculator } from '../../constructs';

export default class ResultCalculatorTestStack extends IntegrationTestStack {
  //
  static readonly ResourceTagKey = 'ResultCalculatorTestStack';

  static readonly TestBucketId = 'TestBucket';

  static readonly TestFileEventTopicId = 'TestFileEventTopic';

  static readonly FileHeaderIndexReaderMockId = 'FileHeaderIndexReader';

  static readonly ErrorTopicObserverId = 'ErrorTopicObserver';

  static readonly BucketEventObserverId = 'BucketEventObserver';

  constructor(scope: cdk.Construct, id: string) {
    //
    // Declare the observers and the mocks

    super(scope, id, {
      testResourceTagKey: ResultCalculatorTestStack.ResourceTagKey,
      observerFunctionIds: [
        ResultCalculatorTestStack.ErrorTopicObserverId,
        ResultCalculatorTestStack.BucketEventObserverId,
      ],
      mockFunctionIds: [ResultCalculatorTestStack.FileHeaderIndexReaderMockId],
    });

    // Test bucket

    const testBucket = new s3.Bucket(this, ResultCalculatorTestStack.TestBucketId, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.addTestResourceTag(testBucket, ResultCalculatorTestStack.TestBucketId);

    // Test file event topic

    const testFileEventTopic = new sns.Topic(
      this,
      ResultCalculatorTestStack.TestFileEventTopicId,
      {}
    );

    this.addTestResourceTag(testFileEventTopic, ResultCalculatorTestStack.TestFileEventTopicId);

    // System under test

    const sut = new ResultCalculator(this, 'SUT', {
      fileEventTopic: testFileEventTopic,
      fileHeaderIndexReaderFunction:
        this.mockFunctions[ResultCalculatorTestStack.FileHeaderIndexReaderMockId],
      fileBucket: testBucket,
    });

    // Observe errors

    sut.errorTopic.addSubscription(
      new snsSubs.LambdaSubscription(
        this.observerFunctions[ResultCalculatorTestStack.ErrorTopicObserverId]
      )
    );

    // Observe bucket

    testBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(
        this.observerFunctions[ResultCalculatorTestStack.BucketEventObserverId]
      )
    );
  }
}
