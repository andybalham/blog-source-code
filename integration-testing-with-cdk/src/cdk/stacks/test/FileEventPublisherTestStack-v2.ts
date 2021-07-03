/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as subscriptions from '@aws-cdk/aws-sns-subscriptions';
import { FileEventPublisher } from '../../constructs';
import { IntegrationTestStack } from '../../../aws-integration-test';

export default class FileEventPublisherTestStack extends IntegrationTestStack {
  //
  static readonly ResourceTagKey = 'FileEventPublisherTestStack-v2';

  static readonly TestBucketId = 'TestBucket';

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testResourceTagKey: 'FileEventPublisherTestStack-v2',
      generateTestObserverFunction: true,
    });

    // Test bucket

    const testBucket = new s3.Bucket(this, FileEventPublisherTestStack.TestBucketId, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.addTestResourceTag(testBucket, FileEventPublisherTestStack.TestBucketId);

    // SUT

    const sut = new FileEventPublisher(this, 'SUT', {
      fileBucket: testBucket,
    });

    // Test subscriber

    sut.fileEventTopic.addSubscription(
      new subscriptions.LambdaSubscription(this.testObserverFunction)
    );
  }
}
