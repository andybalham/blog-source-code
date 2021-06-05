/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as sns from '@aws-cdk/aws-sns';

export interface FileEventPublisherProps {
  bucket: s3.Bucket;
}

export default class FileEventPublisher extends cdk.Construct {
  //
  fileEventTopic: sns.Topic;

  constructor(scope: cdk.Construct, id: string, props: FileEventPublisherProps) {
    super(scope, id);
  }
}
