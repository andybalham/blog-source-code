/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as sfnTasks from '@aws-cdk/aws-stepfunctions-tasks';
import StateMachineWithGraph from '@andybalham/state-machine-with-graph';

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

    // const readFileContent = new tasks.CallAwsService(this, 'ReadFileContent', {
    //   service: 's3',
    //   action: 'getObject',
    //   parameters: {
    //     Bucket: sfn.JsonPath.stringAt('$.destBucket'),
    //     'Key.$': "States.Format('process/{}',$.key)",
    //   },
    //   iamResources: [destinationBucket.arnForObjects('*')],
    //   resultSelector: {
    //     'filecontent.$': 'States.StringToJson($.Body)',
    //   },
    //   resultPath: '$.getObject',
    // });
    // const insertRecord = new tasks.DynamoPutItem(this, 'InsertRecord', {
    //   item: {
    //     id: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.id')),
    //     name: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.name')),
    //   },
    //   table: dynamodbTable,
    //   resultSelector: {
    //     statusCode: sfn.JsonPath.stringAt('$.SdkHttpMetadata.HttpStatusCode'),
    //   },
    // });

    function initialListObjects(sfnScope: cdk.Construct): sfn.IChainable {
      return new sfnTasks.CallAwsService(sfnScope, 'InitialListObjects', {
        service: 's3',
        action: 'listObjectsV2',
        parameters: {
          Bucket: props.sourceBucket.bucketName,
          MaxKeys: 3,
        },
        iamResources: [props.sourceBucket.arnForObjects('*')],
      });
    }

    function indexObject(sfnScope: cdk.Construct): sfn.IChainable {
      return new sfnTasks.CallAwsService(sfnScope, 'HeadObject', {
        service: 's3',
        action: 'headObject',
        parameters: {
          'Bucket.$': '$.BucketName',
          'Key.$': '$.Content.Key',
        },
        iamResources: [props.sourceBucket.arnForObjects('*')],
        resultPath: '$.Head',
      });
    }

    this.stateMachine = new StateMachineWithGraph(this, id, {
      replaceCdkTokens: true,
      getDefinition: (sfnScope): sfn.IChainable =>
        sfn.Chain.start(initialListObjects(sfnScope)).next(
          new sfn.Map(sfnScope, 'ForEachObject', {
            itemsPath: '$.Contents',
            parameters: {
              'Content.$': '$$.Map.Item.Value',
              'BucketName.$': '$.Name',
            },
          }).iterator(indexObject(sfnScope))
        ),
    });

    props.sourceBucket.grantRead(this.stateMachine);
    props.indexTable.grantWriteData(this.stateMachine);
  }
}
