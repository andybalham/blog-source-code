/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as subscriptions from '@aws-cdk/aws-sns-subscriptions';
import * as lambda from '@aws-cdk/aws-lambda';
import { FileEventPublisher } from '../../constructs';

export default class FileEventPublisherTestStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    const testBucket = new s3.Bucket(this, 'TestBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const testSubscriber = new lambda.Function(this, 'TestSubscriber', {
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromInline(
        `exports.handler = (event) => { console.log(JSON.stringify(event)) }`
      ),
    });

    const sut = new FileEventPublisher(this, 'SUT', {
      fileBucket: testBucket,
    });

    sut.fileEventTopic.addSubscription(new subscriptions.LambdaSubscription(testSubscriber));

    new cdk.CfnOutput(this, `TestBucketName`, {
      value: testBucket.bucketName,
    });

    new cdk.CfnOutput(this, `TestSubscriberFunctionName`, {
      value: testSubscriber.functionName,
    });

    cdk.Tags.of(this).add('stack', id);
  }
}
