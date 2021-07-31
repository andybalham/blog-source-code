/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import * as s3 from '@aws-cdk/aws-s3';
import { IntegrationTestStack } from '../../../aws-integration-test';
import { FileHeaderIndexer } from '../../constructs';

export default class FileHeaderIndexerTestStack extends IntegrationTestStack {
  //
  static readonly ResourceTagKey = 'HeaderIndexTestStack';

  static readonly TestFileEventTopicId = 'TestFileEventTopic';

  static readonly TestBucketId = 'TestFileBucket';

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testResourceTagKey: FileHeaderIndexerTestStack.ResourceTagKey,
    });

    // Test file event topic

    const testFileEventTopic = new sns.Topic(
      this,
      FileHeaderIndexerTestStack.TestFileEventTopicId,
      {}
    );

    this.addTestResourceTag(testFileEventTopic, FileHeaderIndexerTestStack.TestFileEventTopicId);

    // Test bucket

    const testBucket = new s3.Bucket(this, FileHeaderIndexerTestStack.TestBucketId, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.addTestResourceTag(testBucket, FileHeaderIndexerTestStack.TestBucketId);

    // SUT

    const sut = new FileHeaderIndexer(this, 'SUT', {
      deploymentTarget: 'TEST',
      fileEventTopic: testFileEventTopic,
      fileBucket: testBucket,
    });

    this.addTestResourceTag(sut.readerFunction, FileHeaderIndexer.ReaderFunctionId);
    this.addTestResourceTag(sut.fileHeaderIndexTable, FileHeaderIndexer.TableId);
  }
}
