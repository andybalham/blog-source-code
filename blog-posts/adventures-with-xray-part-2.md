# Adventures with X-Ray Part 2

Debugging an asynchronous step function

## Overview

In the [first part](TODO) of this series, I added [AWS X-Ray](TODO) to a set of examples for my [CDK Cloud Test Kit](TODO). In this part, I look at adding it to an example application I put together for my series on [implementing Enterprise Integration patterns](TODO). Let's see what adventures I have.

## The example application

The case study we looked at in the series is an application that acts as a loan broker. The application receives a request containing the details of the loan required via an API, and then returns the best rate to a [webhook](https://www.getvero.com/resources/webhooks/).

The following diagram shows how we use a central [EventBridge](https://aws.amazon.com/eventbridge/) event bus to implement this.

![Architecture diagram using EventBridge](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/ent-int-patterns-with-serverless-and-cdk/case-study-eventbridge.png?raw=true)

## Adding X-Ray

Adding X-Ray to the application involved the following steps.

1. Enable tracing via CDK
   - Lambda functions
   - Step functions
1. Wrap SDK clients
   - EventBridge

Enabling tracing on the Lambda functions was as straightforward as adding the following line to the default properties for all Lambda functions in the application.

```TypeScript
export const NODE_DEFAULT_PROPS = {
  // <snip>
  tracing: Tracing.ACTIVE,
};
```

The only place I chose to override this default behaviour was in the API handler. Here I used `Tracing.PASS_THROUGH`, so that it would adhere to the upstream sampling set in the API.

The application only uses one step function and so it was amended directly as follows.

```TypeScript
this.stateMachine = new StateMachine(this, 'StateMachine', {
  tracingEnabled: true,
  // <snip>
});
```

The final step was to wrap all the SDK clients, such as EventBridge or SQS.

As was shown in the diagram above, all communication in the application is done through EventBridge. In fact, all Lambda functions use the same `putDomainEventAsync` method to send domain events.

```TypeScript
export const putDomainEventAsync = async <T extends Record<string, any>>({
  eventBusName,
  domainEvent,
}: {
  eventBusName?: string;
  domainEvent: DomainEvent<T>;
}): Promise<AWS_EventBridge.PutEventsCommandOutput> => {
  // <snip>
};
```

The upshot of this is that there was only one place to wrap the EventBridge SDK client:

```TypeScript
const eventBridge = AWSXRay.captureAWSv3Client(new EventBridge({}));
```

And with this, I had added X-Ray to the whole application.

## Step Functions and `EventBridgePutEvents`

One thing that I was aware of, was that the step function uses `EventBridgePutEvents` direct integration, as highlighted below.

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-2/example-application-step-function-put-events.png?raw=true)

I was asking myself if this call would be traced by X-Ray. To test if this is the case, I decided to run one of the the unit tests that executes the step function.

## The unit test

The unit test differs from a more traditional unit test in that it exercises the step function in the cloud as part of an ephemeral, test-specific CDK stack. This approach allows the Lambda functions used by the step function to be swapped for test-specific implementations. This allows us to script responses for those function and so test all the routes through the step function. For an in-depth look at the approach, please see my post [Step Function integration testing with CDK](https://www.10printiamcool.com/step-function-integration-testing-with-cdk).

The first test I tried initiates the step function by publishing a `quoteSubmitted` event. It then wait for an observer Lambda function to receive a `quoteProcessedEvent`.

```TypeScript
// Act

await putDomainEventAsync({
  eventBusName: loanBrokerEventBus.eventBusArn,
  domainEvent: quoteSubmitted,
});

// Await

const { observations: quoteProcessedObservations, timedOut } =
  await testClient.pollTestAsync({
    filterById: LoanBrokerTestStack.QuoteProcessedObserverId,
    until: async (o) => o.length > 0,
    timeoutSeconds: 30,
  });

// Assert

expect(timedOut).toBeFalsy();
```

However, when I ran the test, I found that it was timing out waiting for the expected event.

## Why is my test failing?

As I was now using X-Ray, I had a look at the service map.

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-2/test-success-with-failures-map.png?raw=true)

On the plus side, I could see that the `EventBridgePutEvents` task does allow events to be traced through EventBridge. On the down side, I could see that there were failures in three places, the step function along with two Lambda functions.

Looking at the trace for the step function, I could see that the 'RequestCreditReport' task was failing just after 6 seconds. The timeout for this task is set to 6 seconds, so this looked like the task was timing out. This would explain why the expected event was not being published.

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-2/test-success-step-function-failures-trace.png?raw=true)

I could also see that the mock Lambda function that provides credit references was failing. This would explain why the step function task was timing out.

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-2/test-success-mock-bureau-failures-trace.png?raw=true)

The invocation duration of 2.99s also looked like a timeout, as the default timeout for Lambda functions is 3 seconds. The console allowed me to quickly dive into the logs and see that this is the case.

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-2/test-success-mock-bureau-timeout-log.png?raw=true)

Looking at the trace for the other failure, I could see that three attempts were made to the Lambda function that handles callbacks to the step function.

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-2/test-success-callback-retries-trace.png?raw=true)

Again, I was easily able to navigate to the logs and see the reason.

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-2/test-success-callback-retry-log.png?raw=true)

I could see that the Lambda function is being invoked as the result of an EventBridge rule, but the step function to be restarted has already finished due to the task timeout.

## The solution

The solution to the timeouts was quite simply to double the memory of the Lambda functions to 256mb and double the timeout to 6 seconds. With these changes in place and deployed, the unit test ran successfully and the resulting service map reflect the clean run.

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-2/test-success-map.png?raw=true)

This clearly shows how EventBridge is at the heart of our application. When I selected a successful trace, I could see all the relevant logs in one place.

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-2/test-success-log.png?raw=true)

## Summary

Although I started this post with the intention of diving into the traces of a full application, that will have to wait until the next post.

This short exercise with the unit test shows quite neatly how you can use the service map and traces to see where issues are. The integration with the logs then allows you to drill down and see the underlying reasons.

I am looking forward to seeing what tracing through the application will bring.

## Addendum

The unit test used a wrapped SDK client to publish events. This cause the following error to appear in the console.

```text
console.error
  2023-08-19 14:28:41.709 +01:00 [ERROR] Error: Failed to get the current sub/segment from the context.
      at Object.contextMissingLogError [as contextMissing] (D:\Users\andyb\Documents\github\blog-enterprise-integration\node_modules\aws-xray-sdk-core\dist\lib\context_utils.js:22:27)
      <snip>
      at Object.<anonymous> (D:\Users\andyb\Documents\github\blog-enterprise-integration\tests\loan-broker\loan-broker.test.ts:178:5)
```

As mention in [Configuring the X-Ray SDK for Node.js](https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-configuration.html), the solution was to add `AWS_XRAY_CONTEXT_MISSING=IGNORE_ERROR` in my `.env` file.

## Links

- [Integrating AWS X-Ray with other AWS services](https://docs.aws.amazon.com/xray/latest/devguide/xray-services.html)
- [How to do Distributed tracing in AWS? | AWS X-ray and Cloudwatch Service Lens](https://www.youtube.com/watch?v=OOScvywKj9s)
- [Tracing AWS SDK calls with the X-Ray SDK for Node.js](https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-awssdkclients.html)
- [How to do Distributed tracing in AWS? | AWS X-ray and Cloudwatch Service Lens](https://www.youtube.com/watch?v=OOScvywKj9s)
- For Lambda
  - [Using AWS Lambda with AWS X-Ray](https://docs.aws.amazon.com/lambda/latest/dg/services-xray.html)
  - [X-Ray Tracing Modes](https://docs.aws.amazon.com/lambda/latest/dg/API_TracingConfig.html)
