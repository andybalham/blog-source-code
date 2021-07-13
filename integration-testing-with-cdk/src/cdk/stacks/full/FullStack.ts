/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import { FileEventPublisher, FileHeaderIndexer } from '../../constructs';

export default class FullStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    const fileBucket = new s3.Bucket(this, 'FileBucket', {
      // The following is probably not what you want for production :)
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const fileEventPublisher = new FileEventPublisher(this, 'FileEventPublisher', {
      deploymentTarget: 'TEST',
      fileBucket,
    });

    const fileHeaderIndexer = new FileHeaderIndexer(this, 'FileHeaderIndexer', {
      deploymentTarget: 'TEST',
      fileEventTopic: fileEventPublisher.fileEventTopic,
      fileBucket,
    });
  }
}
