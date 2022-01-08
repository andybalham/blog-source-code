/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import * as sqs from '@aws-cdk/aws-sqs';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import * as lambda from '@aws-cdk/aws-lambda';
// import * as lambdaEventSources from '@aws-cdk/aws-lambda-event-sources';

export interface ApplicationCreatedFilterProps {
  applicationEventTopic: sns.ITopic;
  highValueFunction: lambda.IFunction;
  postcodeFunction: lambda.IFunction;
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

    const postcodeQueue = new sqs.Queue(this, 'PostcodeQueue');
    props.applicationEventTopic.addSubscription(
      new snsSubs.SqsSubscription(postcodeQueue, {
        rawMessageDelivery: true,
        filterPolicy: createdEventFilterPolicy,
      })
    );

    // https://aws.amazon.com/blogs/compute/filtering-event-sources-for-aws-lambda-functions/
    // When working with SQS, you filter the payload under the “body” attribute
    // https://github.com/serverless-stack/serverless-stack/issues/1170
    // https://medium.com/@philipzeh/event-filtering-for-lambda-functions-using-aws-cdk-d332140590f8
    // https://github.com/aws/aws-cdk/issues/17874
    // https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html

    // High value events

    highValueQueue.grantConsumeMessages(props.highValueFunction);

    // props.highValueFunction.addEventSource(new lambdaEventSources.SqsEventSource(highValueQueue));

    // https://github.com/aws/aws-cdk/issues/7122
    /*
      ApplicationCreatedFilterTestStack | 19:10:32 | CREATE_FAILED        | AWS::Lambda::EventSourceMapping 
        | SUT/TestFunction-HighValueConsumerFunctionHighValueQueueMapping (SUTTestFunctionHighValueConsumerFunctionHighValueQueueMapping0DE8237F) 
      Resource handler returned message: "An event source mapping with SQS arn 
        (" arn:aws:sqs:eu-west-2:361728023653:ApplicationCreatedFilterTestStack-SUTHighValueQueue3EDFCDAC-7W01YNG8GWJZ ") 
        and function (" ApplicationCreatedFilterT-TestFunctionHighValueCon-lVhyDr31OyLQ ") already exists. 
      Please update or delete the existing mapping with UUID 3ccce90f-42a5-46ed-8830-5a2882b041ec 
        (Service: Lambda, Status Code: 409, Request ID: 08498a4b-b509-47f8-b5c7-143da3cfb640, Extended Request ID: null)" 
      (RequestToken: d679bd6c-6748-3df8-b704-12eaaee6ab29, HandlerErrorCode: AlreadyExists)
    */

    const highValueEventSourceMapping = new lambda.EventSourceMapping(
      this,
      `${highValueQueue.node.id + props.highValueFunction.node.id}Mapping`,
      {
        target: props.highValueFunction,
        eventSourceArn: highValueQueue.queueArn,
      }
    );

    const highValueCfnEventSourceMapping = highValueEventSourceMapping.node
      .defaultChild as lambda.CfnEventSourceMapping;
    highValueCfnEventSourceMapping.addPropertyOverride('FilterCriteria', {
      Filters: [
        {
          Pattern: JSON.stringify({
            body: { loanAmount: [{ numeric: ['>', 500000] }] },
          }),
        },
      ],
    });

    // Postcode filtered events

    postcodeQueue.grantConsumeMessages(props.postcodeFunction);

    const postcodeEventSourceMapping = new lambda.EventSourceMapping(
      this,
      `${postcodeQueue.node.id + props.postcodeFunction.node.id}Mapping`,
      {
        target: props.postcodeFunction,
        eventSourceArn: postcodeQueue.queueArn,
      }
    );

    const postcodeCfnEventSourceMapping = postcodeEventSourceMapping.node
      .defaultChild as lambda.CfnEventSourceMapping;
    postcodeCfnEventSourceMapping.addPropertyOverride('FilterCriteria', {
      Filters: [
        {
          Pattern: JSON.stringify({ body: { postcode: [{ prefix: 'MK' }, { prefix: 'PR' }] } }),
        },
      ],
    });
  }
}
