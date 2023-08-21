# Adventures with X-Ray Part 2

## Story

1. Enable tracing in CDK
    - Lambda functions - done
    - Step functions - done
1. Wrap SDK clients
    - EventBridge - done (Is it worth mentioning simplicity working in our favour here?)

Simple with `NODE_DEFAULT_PROPS`:

```TypeScript
export const NODE_DEFAULT_PROPS = {
  // <snip>
  tracing: Tracing.ACTIVE,
};
```

Use `Tracing.PASS_THROUGH` for the API handler.

All Lambda functions use the following, so only one place to wrap the client:

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

```TypeScript
this.stateMachine = new StateMachine(this, 'StateMachine', {
  tracingEnabled: true,
  // <snip>
});
```

In the step function we use `EventBridgePutEvents`:

```TypeScript
/**
 * A StepFunctions Task to send events to an EventBridge event bus
 */
export declare class EventBridgePutEvents extends sfn.TaskStateBase {
    constructor(scope: Construct, id: string, props: EventBridgePutEventsProps);
}
```

Q. Does this add X-Ray tracing?
A. Yes

Mention `AWS_XRAY_CONTEXT_MISSING=IGNORE_ERROR` in `.env`? Does it work? Yes, it prevented:

```text
console.error
  2023-08-19 14:28:41.709 +01:00 [ERROR] Error: Failed to get the current sub/segment from the context.
      at Object.contextMissingLogError [as contextMissing] (D:\Users\andyb\Documents\github\blog-enterprise-integration\node_modules\aws-xray-sdk-core\dist\lib\context_utils.js:22:27)
      at Object.getSegment (D:\Users\andyb\Documents\github\blog-enterprise-integration\node_modules\aws-xray-sdk-core\dist\lib\context_utils.js:89:53)
      at Object.resolveSegment (D:\Users\andyb\Documents\github\blog-enterprise-integration\node_modules\aws-xray-sdk-core\dist\lib\context_utils.js:71:25)
      at D:\Users\andyb\Documents\github\blog-enterprise-integration\node_modules\aws-xray-sdk-core\dist\lib\patchers\aws3_p.js:61:67
      at D:\Users\andyb\Documents\github\blog-enterprise-integration\node_modules\@aws-sdk\middleware-content-length\dist-cjs\index.js:26:16
      at D:\Users\andyb\Documents\github\blog-enterprise-integration\node_modules\@aws-sdk\middleware-serde\dist-cjs\serializerMiddleware.js:13:12
      at processTicksAndRejections (node:internal/process/task_queues:95:5)
      at D:\Users\andyb\Documents\github\blog-enterprise-integration\node_modules\@aws-sdk\middleware-logger\dist-cjs\loggerMiddleware.js:7:26
      at Object.<anonymous> (D:\Users\andyb\Documents\github\blog-enterprise-integration\tests\loan-broker\loan-broker.test.ts:178:5)
```

Running the step function test we can see the following trace:

TODO: Map showing errors

TODO: We can see errors, so look further...

TODO: Trace showing errors

TODO: Go into logs / metrics

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
