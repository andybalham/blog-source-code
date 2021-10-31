/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import * as sqs from '@aws-cdk/aws-sqs';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';
import {
  HIGH_PRIORITY_QUEUE_URL,
  HIGH_PRIORITY_THRESHOLD_DAYS,
  NORMAL_PRIORITY_QUEUE_URL,
} from './priorityRouterFunction-v1a';

export interface PriorityRouterProps {
  highPriorityThresholdDays: number;
  inputTopic: sns.ITopic;
}

export default class PriorityRouter extends cdk.Construct {
  //
  readonly highPriorityQueue: sqs.Queue;

  readonly normalPriorityQueue: sqs.Queue;

  constructor(scope: cdk.Construct, id: string, props: PriorityRouterProps) {
    super(scope, id);

    this.highPriorityQueue = new sqs.Queue(this, 'HighPriorityQueue');
    this.normalPriorityQueue = new sqs.Queue(this, 'NormalPriorityQueue');

    const priorityRouterFunction = new lambdaNodejs.NodejsFunction(this, 'PriorityRouterFunction', {
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: path.join(__dirname, 'priorityRouterFunction-v1b.ts'),
      handler: 'handler',
      environment: {
        [HIGH_PRIORITY_QUEUE_URL]: this.highPriorityQueue.queueUrl,
        [NORMAL_PRIORITY_QUEUE_URL]: this.normalPriorityQueue.queueUrl,
        [HIGH_PRIORITY_THRESHOLD_DAYS]: props.highPriorityThresholdDays.toString(),
      },
    });

    props.inputTopic.addSubscription(new snsSubs.LambdaSubscription(priorityRouterFunction));

    this.highPriorityQueue.grantSendMessages(priorityRouterFunction);
    this.normalPriorityQueue.grantSendMessages(priorityRouterFunction);
  }
}
