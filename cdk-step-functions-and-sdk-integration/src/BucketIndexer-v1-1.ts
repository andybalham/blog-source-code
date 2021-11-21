/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as sfnTasks from '@aws-cdk/aws-stepfunctions-tasks';
import { JsonPath } from '@aws-cdk/aws-stepfunctions';

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

  readonly stateMachine: sfn.StateMachine;

  constructor(scope: cdk.Construct, id: string, props: BucketIndexerProps) {
    super(scope, id);

    const listObjects = new sfnTasks.CallAwsService(this, 'ListObjects', {
      service: 's3',
      action: 'listObjectsV2',
      parameters: {
        Bucket: props.sourceBucket.bucketName,
      },
      iamResources: [props.sourceBucket.arnForObjects('*')],
    });

    const forEachObject = new sfn.Map(this, 'ForEachObject', {
      itemsPath: '$.Contents',
      parameters: {
        'Content.$': '$$.Map.Item.Value',
        'BucketName.$': '$.Name',
      },
      maxConcurrency: 6,
    });

    const headObject = new sfnTasks.CallAwsService(this, 'HeadObject', {
      service: 's3',
      action: 'headObject',
      parameters: {
        'Bucket.$': '$.BucketName',
        'Key.$': '$.Content.Key',
      },
      iamResources: [props.sourceBucket.arnForObjects('*')],
      resultPath: '$.Head',
    });

    const dynamoAttributeStringAt = (jsonPath: string): sfnTasks.DynamoAttributeValue =>
      sfnTasks.DynamoAttributeValue.fromString(JsonPath.stringAt(jsonPath));

    const putObjectIndex = new sfnTasks.DynamoPutItem(this, 'PutObjectIndex', {
      table: props.indexTable,
      item: {
        bucketName: dynamoAttributeStringAt('$.BucketName'),
        key: dynamoAttributeStringAt('$.Content.Key'),
        metadata: sfnTasks.DynamoAttributeValue.fromMap({
          lastModified: dynamoAttributeStringAt('$.Content.LastModified'),
          contentType: dynamoAttributeStringAt('$.Head.ContentType'),
        }),
      },
    });

    this.stateMachine = new sfn.StateMachine(this, 'BucketIndexerStateMachine', {
      definition: sfn.Chain.start(listObjects).next(
        forEachObject.iterator(sfn.Chain.start(headObject).next(putObjectIndex))
      ),
    });

    props.sourceBucket.grantRead(this.stateMachine);
    props.indexTable.grantWriteData(this.stateMachine);
  }
}
