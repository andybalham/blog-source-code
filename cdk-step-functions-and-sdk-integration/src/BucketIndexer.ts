/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as sfn from '@aws-cdk/aws-stepfunctions';

export interface BucketIndexerProps {
  sourceBucket: s3.Bucket;
  indexTable: dynamodb.Table;
}

export default class BucketIndexer extends cdk.Construct {
  //
  static readonly IndexBucketSchema = {
    partitionKey: { name: 'bucketName', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'key', type: dynamodb.AttributeType.STRING },
  };

  readonly stateMachine;

  constructor(scope: cdk.Construct, id: string, props: BucketIndexerProps) {
    super(scope, id);

    const passState = new sfn.Pass(this, 'Pass');

    this.stateMachine = new sfn.StateMachine(this, id, {
      definition: sfn.Chain.start(passState),
    });

    props.sourceBucket.grantRead(this.stateMachine);
    props.indexTable.grantWriteData(this.stateMachine);
  }
}
