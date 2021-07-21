/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sns from '@aws-cdk/aws-sns';
import * as s3 from '@aws-cdk/aws-s3';
import * as sqs from '@aws-cdk/aws-sqs';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import * as lambdaEventSources from '@aws-cdk/aws-lambda-event-sources';
import { FileSectionType } from '../../contracts/FileSectionType';
import { newNodejsFunction } from '../common';
import ResultCalculatorStateMachine from './ResultCalculatorStateMachine';

export interface ResultCalculatorProps {
  fileEventTopic: sns.Topic;
  fileHeaderIndexReaderFunction: lambda.IFunction;
  fileBucket: s3.Bucket;
}

export default class ResultCalculator extends cdk.Construct {
  //
  readonly errorTopic: sns.Topic;

  constructor(scope: cdk.Construct, id: string, props: ResultCalculatorProps) {
    super(scope, id);

    // The recalculation state machine and its dependencies

    const fileHeaderReaderFunction = newNodejsFunction(
      this,
      'FileHeaderReaderFunction',
      'fileHeaderReader',
      {
        FILE_BUCKET_NAME: props.fileBucket.bucketName,
      }
    );

    props.fileBucket.grantRead(fileHeaderReaderFunction);

    const combineHeadersFunction = newNodejsFunction(
      this,
      'CombineHeadersFunction',
      'combineHeaders'
    );

    const calculateResultFunction = newNodejsFunction(
      this,
      'CalculateResultFunction',
      'calculateResult',
      {
        FILE_BUCKET_NAME: props.fileBucket.bucketName,
      }
    );

    props.fileBucket.grantReadWrite(calculateResultFunction);

    this.errorTopic = new sns.Topic(this, 'ResultCalculatorStateMachineErrorTopic');

    const resultCalculatorStateMachine = new ResultCalculatorStateMachine(
      this,
      'ResultCalculatorStateMachine',
      {
        fileHeaderReaderFunction,
        fileHeaderIndexReaderFunction: props.fileHeaderIndexReaderFunction,
        combineHeadersFunction,
        calculateResultFunction,
        errorTopic: this.errorTopic,
      }
    );

    // Subscribe the SQS queue to the SNS topic

    const resultCalculatorQueue = new sqs.Queue(this, 'ResultCalculatorQueue', {
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      visibilityTimeout: cdk.Duration.seconds(3),
    });

    props.fileEventTopic.addSubscription(
      new snsSubs.SqsSubscription(resultCalculatorQueue, {
        rawMessageDelivery: true,
        filterPolicy: {
          sectionType: sns.SubscriptionFilter.stringFilter({ allowlist: [FileSectionType.Body] }),
        },
      })
    );

    // Attach the lambda to initiate the step function

    const resultCalculatorInitiatorFunction = newNodejsFunction(
      this,
      'ResultCalculatorInitiatorFunction',
      'resultCalculatorInitiator',
      {
        STATE_MACHINE_ARN: resultCalculatorStateMachine.stateMachineArn,
      }
    );

    resultCalculatorInitiatorFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(resultCalculatorQueue)
    );

    resultCalculatorStateMachine.grantStartExecution(resultCalculatorInitiatorFunction);
  }
}
