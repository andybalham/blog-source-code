/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import * as sqs from '@aws-cdk/aws-sqs';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import * as lambda from '@aws-cdk/aws-lambda';

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

    const createdEventFilterPolicy = {
      eventType: sns.SubscriptionFilter.stringFilter({ allowlist: ['Created'] }),
    };

    const highValueQueue = new sqs.Queue(this, 'HighValueQueue');
    props.applicationEventTopic.addSubscription(
      new snsSubs.SqsSubscription(highValueQueue, {
        rawMessageDelivery: true,
        filterPolicy: createdEventFilterPolicy,
      })
    );

    const postcodeFilterQueue = new sqs.Queue(this, 'PostcodeFilterQueue');
    props.applicationEventTopic.addSubscription(
      new snsSubs.SqsSubscription(postcodeFilterQueue, {
        rawMessageDelivery: true,
        filterPolicy: createdEventFilterPolicy,
      })
    );

    // https://github.com/serverless-stack/serverless-stack/issues/1170
    // https://medium.com/@philipzeh/event-filtering-for-lambda-functions-using-aws-cdk-d332140590f8
    // https://github.com/aws/aws-cdk/issues/17874
    // https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html

    highValueQueue.grantConsumeMessages(props.highValueThresholdFunction);
    // props.highValueThresholdFunction.addEventSource(
    //   new lambdaEventSources.SqsEventSource(highValueQueue)
    // );
    this.addFilteredSqsEventSource({
      source: highValueQueue,
      target: props.highValueThresholdFunction,
      filters: [{ Pattern: '{ "loanAmount" : [{ "numeric" : [ ">", 500000 ] }] }' }],
    });

    // https://github.com/aws/aws-cdk/issues/7122
    /*
      ApplicationCreatedFilterTestStack | 19:10:32 | CREATE_FAILED        | AWS::Lambda::EventSourceMapping | SUT/TestFunction-HighValueConsumerFunctionHighValueQueueMapping (SUTTestFunctionHighValueConsumerFunctionHighValueQueueMapping0DE8237F) Resource handler returned message: "An event source mapping with SQS arn (" arn:aws:sqs:eu-west-2:361728023653:ApplicationCreatedFilterTestStack-SUTHighValueQueue3EDFCDAC-7W01YNG8GWJZ ") and function (" ApplicationCreatedFilterT-TestFunctionHighValueCon-lVhyDr31OyLQ ") already exists. Please update or delete the existing mapping with UUID 3ccce90f-42a5-46ed-8830-5a2882b041ec (Service: Lambda, Status Code: 409, Request ID: 08498a4b-b509-47f8-b5c7-143da3cfb640, Extended Request ID: null)" (RequestToken: d679bd6c-6748-3df8-b704-12eaaee6ab29, HandlerErrorCode: AlreadyExists)
    */

    postcodeFilterQueue.grantConsumeMessages(props.postcodeFilterFunction);
    this.addFilteredSqsEventSource({
      source: postcodeFilterQueue,
      target: props.postcodeFilterFunction,
      filters: [{ Pattern: '{ "postcode" : [{ "prefix" : "MK" }, { "prefix" : "PR" }]}' }],
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

    // TODO 06Jan22: Could we do something like the following?
    /*
      const eventSource = table.getFunction("consumerA")?.node.children.find(
        child => (child.node.defaultChild as CfnResource)?.cfnResourceType === "AWS::Lambda::EventSourceMapping"
      );
    */

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
