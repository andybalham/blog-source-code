/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as sfnTasks from '@aws-cdk/aws-stepfunctions-tasks';
import StateMachineWithGraph from '@andybalham/state-machine-with-graph';
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

  readonly stateMachine: StateMachineWithGraph;

  constructor(scope: cdk.Construct, id: string, props: BucketIndexerProps) {
    super(scope, id);

    this.stateMachine = new StateMachineWithGraph(this, 'BucketIndexerStateMachine', {
      replaceCdkTokens: true,
      getDefinition: (sfnScope): sfn.IChainable => {
        //
        const listObjectsInitial = new sfnTasks.CallAwsService(sfnScope, 'ListObjectsInitial', {
          service: 's3',
          action: 'listObjectsV2',
          parameters: {
            Bucket: props.sourceBucket.bucketName,
            MaxKeys: 3,
          },
          iamResources: [props.sourceBucket.arnForObjects('*')],
        });

        const headObject = new sfnTasks.CallAwsService(sfnScope, 'HeadObject', {
          service: 's3',
          action: 'headObject',
          parameters: {
            'Bucket.$': '$.BucketName',
            'Key.$': '$.Content.Key',
          },
          iamResources: [props.sourceBucket.arnForObjects('*')],
          resultPath: '$.Head',
        });

        const putObjectIndex = new sfnTasks.DynamoPutItem(sfnScope, 'PutObjectIndex', {
          table: props.indexTable,
          resultPath: JsonPath.DISCARD,
          item: {
            bucketName: sfnTasks.DynamoAttributeValue.fromString(JsonPath.stringAt('$.BucketName')),
            key: sfnTasks.DynamoAttributeValue.fromString(JsonPath.stringAt('$.Content.Key')),
            metadata: sfnTasks.DynamoAttributeValue.fromMap({
              lastModified: sfnTasks.DynamoAttributeValue.fromString(
                JsonPath.stringAt('$.Content.LastModified')
              ),
              contentType: sfnTasks.DynamoAttributeValue.fromString(
                JsonPath.stringAt('$.Head.ContentType')
              ),
            }),
          },
        });

        const forEachObject = new sfn.Map(sfnScope, 'ForEachObject', {
          itemsPath: '$.Contents',
          parameters: {
            'Content.$': '$$.Map.Item.Value',
            'BucketName.$': '$.Name',
          },
          maxConcurrency: 6,
          resultPath: JsonPath.DISCARD,
        });

        const waitForThreeSeconds = new sfn.Wait(sfnScope, 'WaitForTwoSeconds', {
          time: sfn.WaitTime.duration(cdk.Duration.seconds(2)),
        });

        const listObjectsContinuation = new sfnTasks.CallAwsService(
          sfnScope,
          'ListObjectsContinuation',
          {
            service: 's3',
            action: 'listObjectsV2',
            parameters: {
              Bucket: props.sourceBucket.bucketName,
              MaxKeys: 3,
              'ContinuationToken.$': '$.NextContinuationToken',
            },
            iamResources: [props.sourceBucket.arnForObjects('*')],
          }
        );

        const end = new sfn.Pass(sfnScope, 'End');

        const definition = sfn.Chain.start(listObjectsInitial).next(
          forEachObject
            .iterator(sfn.Chain.start(headObject).next(putObjectIndex))
            .next(
              new sfn.Choice(sfnScope, 'IsContinuation')
                .when(
                  sfn.Condition.isPresent('$.NextContinuationToken'),
                  waitForThreeSeconds.next(listObjectsContinuation.next(forEachObject))
                )
                .otherwise(end)
            )
        );

        return definition;
      },
    });

    props.sourceBucket.grantRead(this.stateMachine);
    props.indexTable.grantWriteData(this.stateMachine);
  }
}
