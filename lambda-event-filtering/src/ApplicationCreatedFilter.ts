/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import * as sqs from '@aws-cdk/aws-sqs';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaEventSources from '@aws-cdk/aws-lambda-event-sources';

export interface ApplicationCreatedFilterProps {
  applicationEventTopic: sns.ITopic;
  highValueThresholdAmount: number;
  highValueThresholdFunction: lambda.IFunction;
  postcodeFilter: string[];
  postcodeFilterFunction: lambda.IFunction;
}

export default class ApplicationCreatedFilter extends cdk.Construct {
  //
  constructor(scope: cdk.Construct, id: string, props: ApplicationCreatedFilterProps) {
    super(scope, id);

    const highValueQueue = new sqs.Queue(this, 'HighValueQueue');
    props.applicationEventTopic.addSubscription(new snsSubs.SqsSubscription(highValueQueue));

    const postcodeFilterQueue = new sqs.Queue(this, 'PostcodeFilterQueue');
    props.applicationEventTopic.addSubscription(new snsSubs.SqsSubscription(postcodeFilterQueue));

    // https://github.com/serverless-stack/serverless-stack/issues/1170
    // https://medium.com/@philipzeh/event-filtering-for-lambda-functions-using-aws-cdk-d332140590f8
    // https://github.com/aws/aws-cdk/issues/17874

    highValueQueue.grantConsumeMessages(props.highValueThresholdFunction);
    props.highValueThresholdFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(highValueQueue)
    );

    postcodeFilterQueue.grantConsumeMessages(props.postcodeFilterFunction);

    // https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html

    this.addFilteredSqsEventSource({
      source: postcodeFilterQueue,
      target: props.postcodeFilterFunction,
      filters: [{ Pattern: '{ "body" : { "age": [ { "numeric": [ "=", 27 ] } ]}}' }],
    });
  }

  private addFilteredSqsEventSource({
    source,
    target,
    filters,
    batchSize = 10,
  }: {
    source: sqs.Queue;
    target: lambda.IFunction;
    filters: { Pattern: string }[];
    batchSize?: number;
  }): void {
    const mappingId = `${target.node.id + source.node.id}Mapping`;

    const eventSourceMapping = new lambda.EventSourceMapping(this, mappingId, {
      target,
      batchSize,
      eventSourceArn: source.queueArn,
    });

    const cfnEventSourceMapping = eventSourceMapping.node
      .defaultChild as lambda.CfnEventSourceMapping;
    cfnEventSourceMapping.addPropertyOverride('FilterCriteria', {
      Filters: filters,
    });
  }
}
