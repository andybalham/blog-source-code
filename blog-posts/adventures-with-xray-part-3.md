# Adventures with X-Ray Part 3

## The service map

TODO: Service map

![Service map showing end-to-end application](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/service-map-overview.png?raw=true)

TODO: Show events at the heart

![Focus on events at the heart of the service map](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/service-map-events-and-callback.png?raw=true)

![Service map showing how to view traces from the client](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/service-map-request-trace.png?raw=true)

## Removed observability from tracing

TODO: Talk about observability listeners

TODO: Show trace and mention log being clogged.

![Trace showing how observability is being noisy](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/observability-trace.png?raw=true)

![Architecture diagram showing the observability Lambda function](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/observer.png?raw=true)

TODO: Show observability listeners in log.

![Log showing how observability is being noisy](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/trace-log-with-observers.png?raw=true)

TODO: Talk about `isTestMode` to enable testing, but keep production clean.

```TypeScript
const loggerFunction = new NodejsFunction(
  this,
  'Logger',
  getNodejsFunctionProps({
    // We don't want the observing in the trace for production
    tracing: props.isTestMode ? Tracing.ACTIVE : Tracing.DISABLED,
    logRetention: RetentionDays.ONE_WEEK,
    environment: {
      [ENV_REQUEST_EVENT_TABLE_NAME]: requestEventTable.tableName,
    },
  })
);
```

## Add custom segments

What can we add a segment around? Artificially create a delay.

[Generating custom subsegments with the X-Ray SDK for Node.js](https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-subsegments.html)

From ChatGPT:

```TypeScript
import * as AWSXRay from 'aws-xray-sdk-core';

const handler = async (event: any, context: any) => {
  const segment = AWSXRay.getSegment();

  const subsegment = segment.addNewSubsegment('my-custom-work');
  try {
    // Your custom logic here
    // For instance, you might want to call another service or some computation.

    // If you're working with AWS SDK, make sure to capture those calls too.
    // AWSXRay.captureAWSClient(someAwsServiceClient);

    subsegment.addMetadata('key', 'value');
    subsegment.addAnnotation('key', 'value');
  } catch (error) {
    subsegment.addError(error);
    throw error;
  } finally {
    subsegment.close();
  }
};
```

Note that annotations are key-value pairs with simple data (strings, numbers, or booleans) that are indexed for use with filter expressions. Metadata, on the other hand, can be any related data you'd like to store that's not indexed.

![Trace showing custom segment](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/custom-segment-traces.png?raw=true)

![Trace showing custom segment annotations](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/custom-segment-annotations.png?raw=true)

![Trace showing custom segment metadata](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/custom-segment-metadata.png?raw=true)

## Forcing some errors

Show how error details show up.

![Service map showing Lambda function error](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/error-service-map.png?raw=true)

![Trace showing the step function timeout](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/error-step-function-timeout.png?raw=true)

![Trace showing custom segment failure](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/error-segment-trace.png?raw=true)

![Trace showing custom segment exception](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/adventures-with-xray-part-3/error-segment-exception.png?raw=true)

## Play with Filter Expressions and Queries

TODO

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
