# Lambda Event Filtering With CDK

AWS recently introduced functionality to apply EventBridge-style filtering on Lambda event sources. In this post, we go through a worked example implemented using [AWS CDK](https://aws.amazon.com/cdk/) that takes advantage of this new capability.

The full code for this post can be found on my [GitHub repo](https://github.com/andybalham/blog-source-code/tree/master/lambda-event-filtering).

## TL:DR

* There is no first-class support for event source filtering in CDK currently
* You can add event source filtering by manipulating the CloudFormation directly
* To filter SNS events, you need to use a subscribed SQS queue

## Setting the scene

We are working for Potato Finance, a company that provides loans. We have been tasked with hooking in new functionality when new loan applications are received either for high-value loans or for loans for prestigious locations. Thankfully, Potato Finance has embraced event-driven architecture and has already created an SNS topic that raises events when loan applications are created, updated, or deleted.

For example, when a new loan application is created, an SNS event record like the following is published:

```json
{
  "EventSource": "aws:sns",
  "Sns": {
    "Type": "Notification",
    "Message": "{\"eventType\":\"Created\",\"loanAmount\":266000,\"postcode\":\"JE1 9TE\",\"applicationId\":\"21546845\"}",
    "MessageAttributes": {
      "eventType": {
        "Type": "String",
        "Value": "Created"
      }
    }
  }
```

We have been asked to invoke specific high-value processing when the `loanAmount` is greater that 500,000, and to invoke specific postcode processing when the `postcode` starts with 'MK' or 'PR'. Prior to event source filtering for Lambda functions, we would have had to hook up our Lambda functions to the SNS topic and implement the filtering in code. This would mean that those functions would be invoked and billed when they had nothing meaningful to do. With event source filtering, we can externalise that filtering, simplify our code, and avoid being billed unnecessarily.

## Our approach

Ideally, we would liked to filter the events directly from the SNS topic. However, the [AWS announcement](https://aws.amazon.com/blogs/compute/filtering-event-sources-for-aws-lambda-functions/) in November 2021 said:

> Today, AWS announces the ability to filter messages before the invocation of a Lambda function. Filtering is supported for the following event sources: **Amazon Kinesis Data Streams, Amazon DynamoDB Streams, and Amazon SQS**. This helps reduce requests made to your Lambda functions, may simplify code, and can reduce overall cost.

Given this, our solution will have to use SQS queues hooked up to the SNS topic. We will then attach Lambda functions to the SQS queues and apply filters to the event sources. Our aim is to create a [CDK construct](https://docs.aws.amazon.com/cdk/v1/guide/constructs.html) that encapsulates this functionality:

![blog-lambda-event-filtering.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1641638518208/Tg3gITx4rr.jpeg)

## Creating our construct

As with any CDK construct, we start with the input properties. In our case, this is the application event topic that we will subscribe to, and the two Lambda functions that we will invoke when the filtering matches.

```TypeScript
export interface ApplicationCreatedFilterProps {
  applicationEventTopic: sns.ITopic;
  highValueFunction: lambda.IFunction;
  postcodeFunction: lambda.IFunction;
}
```

For the construct, we start by hooking up two SQS queues to the application event SNS topic. The topic has a message attribute for the `eventType`, so we can use this to apply a preliminary filter. As we are only interested in new loan applications, we add a filter policy so that we only get 'Created' events sent to our SQS queues.

```TypeScript
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
        rawMessageDelivery: true, // Do not wrap message
        filterPolicy: createdEventFilterPolicy,
      })
    );

    const postcodeQueue = new sqs.Queue(this, 'PostcodeQueue');
    props.applicationEventTopic.addSubscription(
      new snsSubs.SqsSubscription(postcodeQueue, {
        rawMessageDelivery: true, // Do not wrap message
        filterPolicy: createdEventFilterPolicy,
      })
    );
}
```

> Note that we are setting `rawMessageDelivery` to `true` for the subscriptions. Doing so ensures that the message to the queue is the same as it was sent to the topic. Otherwise, the message will be wrapped in an SNS envelope and this would make filtering much more difficult. With this set to `true` we should receive SQS messages like the following:

```json
{
  "eventType": "Created",
  "loanAmount": 266000,
  "postcode": "JE1 9TE",
  "applicationId": "21546845"
}
```

## Adding filtering

The next step is for us to allow our functions to consume messages from the SQS queues and to add event sources, so that they will poll for messages from the queue. For our high value queue, this is done as follows:

```TypeScript
highValueQueue.grantConsumeMessages(props.highValueFunction);

props.highValueFunction.addEventSource(
  new lambdaEventSources.SqsEventSource(highValueQueue));
```

Now, the logical place for us to specify the filter would be via the `SqsEventSourceProps` passed to the `SqsEventSource` constructor. However, as at the time of writing, there is no such option. There is an [GitHub issue](https://github.com/aws/aws-cdk/issues/17874) raised for this. However, the issue did link to an excellent [blog post](https://medium.com/@philipzeh/event-filtering-for-lambda-functions-using-aws-cdk-d332140590f8) that describes an interim solution for CDK.

The solution described involves creating the `EventSourceMapping` explicitly, rather than using `addEventSource`, and then manipulating the resulting CloudFormation to add a `Filters` property. With this in mind, the original code for the high value queue becomes the following:

```TypeScript
highValueQueue.grantConsumeMessages(props.highValueFunction);

const highValueEventSourceMapping = new lambda.EventSourceMapping(
  this,
  `${highValueQueue.node.id + props.highValueFunction.node.id}Mapping`,
  {
    target: props.highValueFunction,
    eventSourceArn: highValueQueue.queueArn,
  }
);
```

The resulting CloudFormation generated from `cdk synth` is the following:

```yaml
SUTHighValueQueueTestFunctionHighValueConsumerFunctionMapping9A5748BD:
  Type: AWS::Lambda::EventSourceMapping
  Properties:
    FunctionName:
      Ref: TestFunctionHighValueConsumerFunction40C73279
    EventSourceArn:
      Fn::GetAtt:
        - SUTHighValueQueue3EDFCDAC
        - Arn
```

Looking at the example given in the [announcement](https://aws.amazon.com/blogs/compute/filtering-event-sources-for-aws-lambda-functions/), we can see that we need to add a `FilterCriteria` property similar to the example shown below:

```yaml
Properties:
  # ...snip...
  FilterCriteria:
    Filters:
      - Pattern: '{"data": {"tire_pressure": [{"numeric": ["<", 32]}]}}'
```

To do this, we need to access the underlying CloudFormation and use the `addPropertyOverride` to add our filter. We do this as follows:

```TypeScript
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
```

> Note that when working with SQS, you filter the payload under the “body” attribute.

Running `cdk synth`, we can see that the following CloudFormation was generated:

```yaml
SUTHighValueQueueTestFunctionHighValueConsumerFunctionMapping9A5748BD:
  Type: AWS::Lambda::EventSourceMapping
  Properties:
    FunctionName:
      Ref: TestFunctionHighValueConsumerFunction40C73279
    EventSourceArn:
      Fn::GetAtt:
        - SUTHighValueQueue3EDFCDAC
        - Arn
    FilterCriteria:
      Filters:
        - Pattern: '{"body":{"loanAmount":[{"numeric":[">",500000]}]}}'
```

This looks correct, so we repeat the approach for the postcode queue as follows:

```TypeScript
const postcodeCfnEventSourceMapping = postcodeEventSourceMapping.node
  .defaultChild as lambda.CfnEventSourceMapping;
postcodeCfnEventSourceMapping.addPropertyOverride('FilterCriteria', {
  Filters: [
  {
    Pattern: JSON.stringify({ body: { postcode: [{ prefix: 'MK' }, { prefix: 'PR' }] } }),
  },
],
});
```

Here we take advantage of the fact that now we have the full power of [EventBridge pattern matching](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html). In this case, we match on multiple prefixes in order to identify two prestigious locations in the UK that Potato Finance are particularly interested in.

The full code for the construct can be found on the [GitHub repo](https://github.com/andybalham/blog-source-code/blob/master/lambda-event-filtering/src/ApplicationCreatedFilter.ts).

## Testing the construct

To test the construct, we use the [Serverless Testing Toolkit](https://www.npmjs.com/package/@andybalham/sls-testing-toolkit) to create a [test stack](https://github.com/andybalham/blog-source-code/blob/master/lambda-event-filtering/lib/ApplicationCreatedFilterTestStack.ts). The test stack allows us to deploy an isolated instance of the construct to AWS. With this deployed, we can run a set of [unit tests](https://github.com/andybalham/blog-source-code/blob/master/lambda-event-filtering/test/ApplicationCreatedFilter.test.ts) against it and verify that events are filtered and routed as expected.

Testing the filtering can be a bit of challenge. This is in part due to the fact that if a message does not meet the filter criteria, then it is just thrown away. It is worth knowing about the following from the AWS documentation:

> When you write event patterns to match events, you can use the TestEventPattern API or the test-event-pattern CLI command to test that your pattern matches the correct events. For more information, see [TestEventPattern](https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_TestEventPattern.html).

## Summary

In this post, we have seen how we can use the new event source filtering functionality to route messages based on their content. In our case, we were able to filter events from an existing SNS topic without having to change the code that generated those events. Previously, we would either have had to amend the publishing code to add message attributes, or we would have had to code the filtering into our consuming Lambda functions and have unnecessary invocations.

### Deployment Issues Addendum

From time-to-time when developing the code for this blog post, I encountered a `CREATE_FAILED` error when updating the event source mapping. The message was of the following format:

```
Resource handler returned message:
"An event source mapping with SQS arn (" arn:aws:sqs:eu-west-2:{account}:{queueName} ")
   and function (" {functionName} ") already exists.
Please update or delete the existing mapping with UUID {mappingUUID}
...
```

My solution was not ideal, but involved using the AWS console to manually remove the SQS trigger from the Lambda function before redeploying. A similar [issue](https://github.com/aws/aws-cdk/issues/7122) had been raised a while back on GitHub. Perhaps this will go away when there is first-class support in the CDK for event source filtering.
