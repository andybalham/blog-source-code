/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import * as sqs from '@aws-cdk/aws-sqs';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import {
  HIGH_PRIORITY_QUEUE_URL,
  HIGH_PRIORITY_THRESHOLD_DAYS,
  NORMAL_PRIORITY_QUEUE_URL,
} from './DeadlineRouter.RouterFunction';

export interface DeadlineRouterProps {
  highPriorityThresholdDays: number;
  inputTopic: sns.ITopic;
}

export default class DeadlineRouter extends cdk.Construct {
  //
  readonly highPriorityQueue: sqs.Queue;

  readonly normalPriorityQueue: sqs.Queue;

  readonly routerFunction: lambda.IFunction;

  constructor(scope: cdk.Construct, id: string, props: DeadlineRouterProps) {
    super(scope, id);

    this.highPriorityQueue = new sqs.Queue(this, 'HighPriorityQueue');
    this.normalPriorityQueue = new sqs.Queue(this, 'NormalPriorityQueue');

    this.routerFunction = new lambdaNodejs.NodejsFunction(this, 'RouterFunction', {
      environment: {
        [HIGH_PRIORITY_QUEUE_URL]: this.highPriorityQueue.queueUrl,
        [NORMAL_PRIORITY_QUEUE_URL]: this.normalPriorityQueue.queueUrl,
        [HIGH_PRIORITY_THRESHOLD_DAYS]: props.highPriorityThresholdDays.toString(),
      },
    });

    props.inputTopic.addSubscription(new snsSubs.LambdaSubscription(this.routerFunction));

    this.highPriorityQueue.grantSendMessages(this.routerFunction);
    this.normalPriorityQueue.grantSendMessages(this.routerFunction);
  }
}
