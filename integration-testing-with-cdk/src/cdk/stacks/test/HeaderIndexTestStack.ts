/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import { HeaderIndexer } from '../../constructs';
import { IntegrationTestStack } from '../../../aws-integration-test';

export default class HeaderIndexTestStack extends IntegrationTestStack {
  //
  static readonly ResourceTagKey = 'HeaderIndexTestStack';

  static readonly TestFileEventTopicId = 'TestFileEventTopic';

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testResourceTagKey: HeaderIndexTestStack.ResourceTagKey,
    });

    // Test file event topic

    const testFileEventTopic = new sns.Topic(this, HeaderIndexTestStack.TestFileEventTopicId, {});
    
    this.addTestResourceTag(testFileEventTopic, HeaderIndexTestStack.TestFileEventTopicId);

    // SUT

    const sut = new HeaderIndexer(this, 'SUT', {
      fileEventTopic: testFileEventTopic,
    });

    // Tag the reader function to enable us to locate it

    this.addTestResourceTag(sut.readerFunction, HeaderIndexer.ReaderFunctionId);
  }
}
