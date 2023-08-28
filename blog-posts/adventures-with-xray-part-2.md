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

One thing that I was aware of, was that the step function uses `EventBridgePutEvents` direct integration, as shown below.

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-2/example-application-step-function.png?raw=true)

TODO

TODO: Diagram



```TypeScript
/**
 * A StepFunctions Task to send events to an EventBridge event bus
 */
export declare class EventBridgePutEvents extends sfn.TaskStateBase {
    constructor(scope: Construct, id: string, props: EventBridgePutEventsProps);
}
```

I was asking myself if this call would be traced by X-Ray. To test if this is the case, I decided to run one of the the unit tests that executes the step function. This unit test differs from a more traditional unit test in that it exercises the step function in the cloud as part of a test-specific CDK stack.

The test waits for an event being published that indicates success. However, I found that the test failed. So I looked at the service map:

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-2/test-success-with-failures-map.png?raw=true)

I could see that there were failures in three places. The step function was failing, along with two Lambda functions.

Looking at the trace for the step function, I could see that the 'RequestCreditReport' task was timing out (the timeout was set to 6 seconds).

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-2/test-success-step-function-failures-trace.png?raw=true)

I could also see that the Lambda function that providing mock credit bureau was failing.

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-2/test-success-mock-bureau-failures-trace.png?raw=true)

The invocation duration of 2.99s looked a bit like a timeout. The console allowed me to quickly dive into the logs and see that this is the case.

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-2/test-success-mock-bureau-timeout-log.png?raw=true)

Looking at the trace for the other failure, I could see that three attempts were made to the Lambda function that handles callbacks to the step function.

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-2/test-success-callback-retries-trace.png?raw=true)

Again, I was easily able to navigate to the logs and see the reason.

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-2/test-success-callback-retry-log.png?raw=true)

I could see that the Lambda function is being invoked as the result of an EventBridge rule, but the step function to be restarted has already finished due to the task timeout.

This short exercise shows quite neatly how you can use the service map and traces to see where issues are, and then how the integration with the logs allows you to drill down and see the reasons.

------------------------------------------------------------

Mention `AWS_XRAY_CONTEXT_MISSING=IGNORE_ERROR` in `.env`? Does it work? Yes, it prevented:

```text
console.error
  2023-08-19 14:28:41.709 +01:00 [ERROR] Error: Failed to get the current sub/segment from the context.
      at Object.contextMissingLogError [as contextMissing] (D:\Users\andyb\Documents\github\blog-enterprise-integration\node_modules\aws-xray-sdk-core\dist\lib\context_utils.js:22:27)
      <snip>
      at Object.<anonymous> (D:\Users\andyb\Documents\github\blog-enterprise-integration\tests\loan-broker\loan-broker.test.ts:178:5)
```

## Notes

Links:

- [Integrating AWS X-Ray with other AWS services](https://docs.aws.amazon.com/xray/latest/devguide/xray-services.html)
  - List of supported services
- [How to do Distributed tracing in AWS? | AWS X-ray and Cloudwatch Service Lens](https://www.youtube.com/watch?v=OOScvywKj9s)
- [aws-cdk-lib.aws_xray module](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_xray-readme.html)
- [Tracing AWS SDK calls with the X-Ray SDK for Node.js](https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-awssdkclients.html)
- [How to do Distributed tracing in AWS? | AWS X-ray and Cloudwatch Service Lens](https://www.youtube.com/watch?v=OOScvywKj9s)
- For Lambda
  - [Using AWS Lambda with AWS X-Ray](https://docs.aws.amazon.com/lambda/latest/dg/services-xray.html)
  - [X-Ray Tracing Modes](https://docs.aws.amazon.com/lambda/latest/dg/API_TracingConfig.html)
- For API Gateway
  - [Setting up AWS X-Ray with API Gateway REST APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-enabling-xray.html)
  - [aws-cdk-lib.aws_apigateway module](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway-readme.html)
  - [class Stage (construct)](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.Stage.html)
    - Tracing is enabled at a `Stage` level
  - [Deploying your CDK app to different stages and environments](https://taimos.de/blog/deploying-your-cdk-app-to-different-stages-and-environments) - Not really useful
  - [Deploy multiple API Gateway stages with AWS CDK](https://stackoverflow.com/questions/62449187/deploy-multiple-api-gateway-stages-with-aws-cdk)

Active vs passive. Passive seems not to log.

```TypeScript
export declare enum Tracing {
    /**
     * Lambda will respect any tracing header it receives from an upstream service.
     * If no tracing header is received, Lambda will sample the request based on a fixed rate. Please see the [Using AWS Lambda with AWS X-Ray](https://docs.aws.amazon.com/lambda/latest/dg/services-xray.html) documentation for details on this sampling behaviour.
     */
    ACTIVE = "Active",
    /**
     * Lambda will only trace the request from an upstream service
     * if it contains a tracing header with "sampled=1"
     */
    PASS_THROUGH = "PassThrough",
    /**
     * Lambda will not trace any request.
     */
    DISABLED = "Disabled"
}
```

[What is `Active tracing` mean in lambda with Xray?](https://stackoverflow.com/questions/64800794/what-is-active-tracing-mean-in-lambda-with-xray):

> AWS Lambda supports both active and passive instrumentation. So basically you use passive instrumentation if your function handles requests that have been sampled by some other service (e.g. API gateway). In contrast, if your function gets "raw" un-sampled requests, you should use active instrumentation, so that the sampling takes place.

Do we want an active observer or a passive one? We want an active one for observers as they are triggered by events.

Why do you see two Lambda functions? I think the answer was in the video.

Even without SNS client, it was able to show the Lambda functions being invoked. You couldn't see the SNS queue in the middle though.

Wrapping the test clients with `AWSXRay.captureAWSv3Client` didn't seem to have any effect. They complain with the following:

```text
2023-07-26 19:15:40.467 +01:00 [ERROR] Error: Failed to get the current sub/segment from the context.
    at Object.contextMissingLogError [as contextMissing] (D:\Users\andyb\Documents\github\cdk-cloud-test-kit\node_modules\aws-xray-sdk-core\dist\lib\context_utils.js:22:27)
```

[Developer Guide](https://docs.aws.amazon.com/pdfs/xray/latest/devguide/xray-guide.pdf)

[Configuring the X-Ray SDK for Node.js](https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-configuration.html)

Tried the following:

```TypeScript
AWSXRay.enableManualMode();

const testClient = new IntegrationTestClient({
  testStackId: SimpleEventRouterTestStack.Id,
  clientOverrides: {
    snsClient: AWSXRay.captureAWSv3Client(
      new SNSClient({ region: IntegrationTestClient.getRegion() }),
      new AWSXRay.Segment('SimpleEventRouterTest')
    ),
  },
});
```

Even manually overriding the middleware didn't improve the trace

TODO: Perhaps try the following: <https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-subsegments.html>. What is the advantage of actually doing this?
