/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import * as s3 from '@aws-cdk/aws-s3';
import * as lambda from '@aws-cdk/aws-lambda';

export interface ResultCalculatorProps {
  fileEventTopic: sns.Topic;
  fileHeaderReaderFunction: lambda.IFunction
  fileBucket: s3.Bucket;
}

export default class ResultCalculator extends cdk.Construct {
  //
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(scope: cdk.Construct, id: string, props: ResultCalculatorProps) {
    super(scope, id);

  }
}
