/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { IntegrationTestStack } from '@andybalham/sls-testing-toolkit';
import path from 'path';
import fs from 'fs';
import StateMachineWithGraph from '@andybalham/state-machine-with-graph';
import BucketIndexer from '../src/BucketIndexer';

export default class BucketIndexerTestStack extends IntegrationTestStack {
  //
  static readonly StackId = 'BucketIndexerTestStack';

  static readonly SUTStateMachineId = 'SUTStateMachine';

  static readonly TestSourceBucketId = 'TestSourceBucket';

  static readonly TestIndexTableId = 'TestIndexTable';

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testStackId: BucketIndexerTestStack.StackId,
    });

    const testSourceBucket = new s3.Bucket(this, BucketIndexerTestStack.TestSourceBucketId, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const testIndexTable = new dynamodb.Table(this, BucketIndexerTestStack.TestIndexTableId, {
      ...BucketIndexer.IndexBucketSchema,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const sut = new BucketIndexer(this, 'SUT', {
      sourceBucket: testSourceBucket,
      indexTable: testIndexTable,
    });

    this.addTestResourceTag(testSourceBucket, BucketIndexerTestStack.TestSourceBucketId);
    this.addTestResourceTag(testIndexTable, BucketIndexerTestStack.TestIndexTableId);
    this.addTestResourceTag(sut.stateMachine, BucketIndexerTestStack.SUTStateMachineId);

    BucketIndexerTestStack.writeGraphJson(sut.stateMachine);
  }

  static writeGraphJson(stateMachine: StateMachineWithGraph): void {
    //
    const stateMachinePath = path.join(__dirname, '..', '.stateMachineASL');

    if (!fs.existsSync(stateMachinePath)) fs.mkdirSync(stateMachinePath);

    fs.writeFileSync(
      path.join(stateMachinePath, `${stateMachine.node.id}.asl.json`),
      stateMachine.graphJson
    );
  }
}
