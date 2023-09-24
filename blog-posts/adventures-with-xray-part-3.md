# Adventures with X-Ray Part 3

## Instrumenting a whole application

In this post I continue my [adventures with X-Ray](TODO) and try my hand at observing a whole application. In the previous posts in the [series](TODO), I looked at using X-Ray in a small context. Here we will see what happens when an end-to-end process is traced and logged.

## The example application

The case study we looked at in the series on [implementing Enterprise Integration patterns](https://www.10printiamcool.com/series/enterprise-patterns-cdk) is an application that acts as a loan broker. The application in question receives a request containing the details of the loan required via an API, and then returns the best rate to a [webhook](https://www.getvero.com/resources/webhooks/).

The following diagram shows how we use a central [EventBridge](https://aws.amazon.com/eventbridge/) event bus to implement this.

![Architecture diagram using EventBridge](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/ent-int-patterns-with-serverless-and-cdk/case-study-eventbridge.png?raw=true)

## View the service map

In the [last post](TODO), I walked through how I added X-Ray to the whole application. Now when I run some requests through the API, we see the following service map.

![Service map showing end-to-end application](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/service-map-overview.png?raw=true)

What is quite clear from this picture, is that events are at the heart of this application.

![Focus on events at the heart of the service map](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/service-map-events-and-callback.png?raw=true)

Now, by clicking on the client, we can trace a request all the way through the application and out to the webhook.

![Service map showing how to view traces from the client](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/service-map-request-trace.png?raw=true)

However, when I tried this, I found something that was hindering the observability. Ironically, it was observability that I added in the post on [Domain Observability](https://www.10printiamcool.com/enterprise-integration-patterns-domain-observability).

## Removing observability from tracing

In that [post](https://www.10printiamcool.com/enterprise-integration-patterns-domain-observability), I added business-level observability by hooking a Lambda function up to the domain events being raised.

![Architecture diagram showing the observability Lambda function](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/observer.png?raw=true)

However, as I had enabled tracing for this Lambda function, the trace included numerous entries for the observers which clouded the picture of the process.

![Trace showing how observability is being noisy](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/observability-trace.png?raw=true)

When viewing the log, this was further apparent.

![Log showing how observability is being noisy](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/trace-log-with-observers.png?raw=true)

The solution is to specify `Tracing.DISABLED` for the observability Lambda functions. However, as I still wanted the traces when testing the Lambda functions, I added a `isTestMode` property the observability [CDK](https://aws.amazon.com/cdk/) stack as follows.

```TypeScript
const loggerFunction = new NodejsFunction(
  this,
  'Logger',
  getNodejsFunctionProps({
    // We don't want the observing in the trace for production
    tracing: props.isTestMode ? Tracing.ACTIVE : Tracing.DISABLED,
    // <snip>
  })
);
```

Now production traces are clean, but we can also take advantage of X-Ray when testing the functionality.

## Adding custom subsegments

The article [Generating custom subsegments with the X-Ray SDK for Node.js](https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-subsegments.html) describes subsegments as follows.

> Subsegments extend a trace's segment with details about work done in order to serve a request. Each time you make a call with an instrumented client, the X-Ray SDK records the information generated in a subsegment. You can create additional subsegments to group other subsegments, to measure the performance of a section of code, or to record annotations and metadata.

In our application, we have Lambda functions that simulate response from lender systems. At the moment, this is just an algorithm, but in practise would be a call that would take time and be prone to error. This would be an ideal call to surround with a custom subsegment.

With this in mind, I added the following code to allow the lender configuration to control the delay in responding and whether an error occurred.

```TypeScript
const simulateExternalCallAsync = async (
  lenderConfig: LenderConfig
): Promise<void> => {
  const randomPercentage = randomInt(100);
  const errorPercentage = lenderConfig.errorPercentage ?? 0;
  const throwError = randomPercentage <= errorPercentage;

  const delayMillis = lenderConfig.minDelayMillis ?? 1000 + randomInt(1000);
  await new Promise((resolve) => setTimeout(resolve, delayMillis));

  if (throwError) {
    const errorMessage = `Simulated error (${randomPercentage} <= ${errorPercentage})`;
    throw new Error(errorMessage);
  }
};
```

With this in place, I added the code below around the call to `simulateExternalCallAsync` to add and close the subsegment.

```TypeScript
import * as AWSXRay from 'aws-xray-sdk';

// <snip>

const segment = AWSXRay.getSegment();
const subsegment = segment?.addNewSubsegment('External Call');

try {
  // Simple values that are indexed for filter expressions
  subsegment?.addAnnotation('callType', 'Lender');
  subsegment?.addAnnotation('lenderId', lenderConfig.lenderId);
  // Related data for debugging purposes
  subsegment?.addMetadata('lenderDetails', {
    lenderId: lenderConfig.lenderId,
    lenderName: lenderConfig.lenderName,
    lenderUrl: `https://${lenderConfig.lenderId}.com`,
  });

  await simulateExternalCallAsync(lenderConfig);

} catch (error) {
  if (error instanceof Error) {
    // Add error to the subsegment
    subsegment?.addError(error);
  }
  throw error;
} finally {
  // Ensure the subsegment is closed
  subsegment?.close();
}
```

I redeployed the lenders, with the configuration set to introduce delays but not throw any errors. After running a request, I could see the following in the trace.

![Trace showing custom segment](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/custom-segment-traces.png?raw=true)

So we can now see the time taken for our 'external call'. What we can also see is the annotation and metadata that we added to the subsegment. Annotations are key-value pairs with simple data (strings, numbers, or booleans) that are indexed for use with filter expressions, whilst metadata can be any related data you'd like to store that's not indexed.

Clicking on the 'Annotations' tab of the segment details, we can see what type of call it was and which lender was called.

![Trace showing custom segment annotations](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/custom-segment-annotations.png?raw=true)

For more data, clicking on 'Metadata' shows the lender name and the URL being 'called'.

![Trace showing custom segment metadata](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/custom-segment-metadata.png?raw=true)

## Forcing some errors

TODO: Show how error details show up.

![Service map showing Lambda function error](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/error-service-map.png?raw=true)

![Trace showing the step function timeout](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/error-step-function-timeout.png?raw=true)

![Trace showing custom segment failure](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/error-segment-trace.png?raw=true)

![Trace showing custom segment exception](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/error-segment-exception.png?raw=true)

## Running a workload

TODO: Putting through multiple requests trips, show errors and unexpected causes.

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/running-system-service-map.png?raw=true)

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/running-system-bad-logic.png?raw=true)

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/running-system-rate-exceeded.png?raw=true)

## Summary

TODO

## Links

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
