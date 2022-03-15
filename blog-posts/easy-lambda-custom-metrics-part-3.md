# Title - TODO

## Overview

In the [first post](TODO) of the series we saw how we can use the [`aws-embedded-metrics`](TODO) npm package to easily output custom metrics from our Lambda functions. In the [second post](TODO), we saw how we could use custom metrics to trigger alarms when our application went wrong. In this final post of the series, we will see how we can add properties to our custom metrics to help us diagnose what has gone wrong.

TODO: GitHub repo

## TL;DR

TODO

## The application

Our application is a [step function](https://aws.amazon.com/step-functions/) that consists of two Lambda functions that make calls to external APIs, followed by a Lambda function that persists the results. If calls to either of the external APIs fails, then the error is caught and handled by a Lambda function that records a custom metrics indicating that an error occurred.

![Loan Processor step function diagram](https://cdn.hashnode.com/res/hashnode/image/upload/v1647163151800/aUH-p_9L9.png)

We already have an alarm set up to alert us when either of the API calls fail, but what if we could easily find out exactly which request failed? Well, we can do just that by adding properties to our metrics.

## Correlation IDs

To quote the first article below:

> A Correlation ID is a unique identifier that is added to the very first interaction (incoming request) to identify the context and is passed to all components that are involved in the transaction flow. Correlation ID becomes the glue that binds the transaction together and helps to draw an overall picture of events.

- [Correlation IDs - Code With Engineering Playbook](https://microsoft.github.io/code-with-engineering-playbook/observability/correlation-id/)
- [A consistent approach to track correlation IDs through microservices - The Burning Monk](https://theburningmonk.com/2015/05/a-consistent-approach-to-track-correlation-ids-through-microservices/)

In our application, each request has the following structure, where `correlationId` contains a unique identifier:

```json
{
  "correlationId": "gMQdTVVTA6jM6GOgheblB",
  "firstName": "Trevor",
  "lastName": "Potato",
  "postcode": "MK3 9SE"
}
```

So by logging the correlation ID with each of our metrics, we will be able to tie a sequence of the log entries together.

## Adding properties

Adding properties to our metrics is a straightforward process, we just use the `setProperty` method and specify a name and value.

First up is our error handler Lambda function:

```TypeScript
export const handler = metricScope(
  (metrics) =>
    async (event: any): Promise<void> => {
      metrics
        .setNamespace('EmbeddedMetricsExample')
        .setDimensions({ ProcessName: 'LoanProcessor' })
        .putMetric('ErrorCount', 1, Unit.Count)
        .setProperty('CorrelationId', event.correlationId)
        .setProperty('StateMachineName', event.stateMachineName)
        .setProperty('FailedStateName', event.failedStateName)
        .setProperty('Cause', event.cause);
    }
);
```

The next step is to update the corresponding state in the step function definition. Here we use the [Context Object](https://docs.aws.amazon.com/step-functions/latest/dg/input-output-contextobject.html) to access the name of the state machine and the correlation ID from the input. We also use the `States.StringToJson` utility function to convert the error cause into an object, which will make reading the resulting log entry much easier.

```json
"HandleIdentityCheckFailure": {
  "Next": "IdentityCheckFail",
  "Type": "Task",
  "Resource": "arn:aws:lambda:eu-west-2:XXXXXXXX:function:LoanProcessorTestStack-LoanProcessorErrorHandlerFu-XXXXXXXX",
  "Parameters": {
    "failedStateName": "IdentityCheckGateway",
    "stateMachineName.$": "$$.StateMachine.Name",
    "correlationId.$": "$$.Execution.Input.correlationId",
    "cause.$": "States.StringToJson($.Cause)"
  }
}
```

Next we look at the proxy Lambda functions. In both cases, we want to record the URL being called and the status code returned. More importantly, we also want to record the API request id and the correlation id that we were passed in the original request.

```TypeScript
metrics
  .setNamespace('EmbeddedMetricsExample')
  .setDimensions({ GatewayName: gatewayName })
  .putMetric('ResponseTime', responseTime, Unit.Milliseconds)
  .setProperty('StatusCode', response.status)
  .setProperty('GatewayUrl', url)
  .setProperty('CorrelationId', request.correlationId)
  .setProperty('RequestId', request.requestId);
```

Again, we need to update the corresponding state in the step function definition to ensure we have the appropriate values:

```json
"IdentityCheckGateway": {
  "Next": "CreditReferenceGateway",
  // <snip>
  "Type": "Task",
  "ResultPath": "$.identityCheck",
  "Resource": "arn:aws:lambda:eu-west-2:XXXXXXXX:function:LoanProcessorTestStack-LoanProcessorIdentityCheckP-XXXXXXX",
  "Parameters": {
    "correlationId.$": "$$.Execution.Input.correlationId",
    "firstName.$": "$$.Execution.Input.firstName",
    "lastName.$": "$$.Execution.Input.lastName",
    "postcode.$": "$$.Execution.Input.postcode"
  }
}
```

## Generating some errors

The next thing to do is to run our application and wait for errors. This is straightforward, as we can configure the APIs being called to error a certain percentage of the time. With these set to 10%, we can run a [unit test](TODO) to call the step function every few seconds and wait.

Sure enough, before long we see that our alarm has triggered:

![AWS Console showing the triggered alarm](https://cdn.hashnode.com/res/hashnode/image/upload/v1647375245599/W0hWcuJuE.png)

And in the logs we see the following entry for the error handler Lambda function:

![Lambda error in CloudWatch](https://cdn.hashnode.com/res/hashnode/image/upload/v1647375657561/wI7lyn2fS.png)

## Investigating the errors

However, AWS provides us with an alternative to manually searching through the logs. By using the [aws-embedded-metrics](https://github.com/awslabs/aws-embedded-metrics-node) package, we have used [structured logging](https://stackify.com/what-is-structured-logging-and-why-developers-need-it/). This means that we can query the logs using [CloudWatch Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AnalyzingLogData.html) and the properties that we specified.

As mentioned in an earlier post, AWS logs many metrics automatically and for free. These can be queried via CloudWatch Insights, see the following post for many useful examples:

- [Serverless Amazon CloudWatch Logs Insights Examples](https://github.com/julianwood/serverless-cloudwatch-logs-insights-examples)

TODO

![CloudWatch Insights query for Loan Processor errors](https://cdn.hashnode.com/res/hashnode/image/upload/v1647375273164/9XYk9-YbP.png)

![CloudWatch Insights results for Loan Processor query](https://cdn.hashnode.com/res/hashnode/image/upload/v1647375303479/aK5G8j0-U.png)

![CloudWatch Insights query by correlation id](https://cdn.hashnode.com/res/hashnode/image/upload/v1647375326132/cF11ABN9P.png)

![CloudWatch Insights results for correlation id query](https://cdn.hashnode.com/res/hashnode/image/upload/v1647375333091/w2n9PrY9I.png)

TODO

## Do as I say, not as do

TODO: Mention logging PII

## Summary

TODO

## Notes

Standard vs High-resolution metrics?

You may wonder how to delete a metric. Well, once created, a metric cannot be explicitly deleted. As explained by the [Amazon CloudWatch FAQs](https://aws.amazon.com/cloudwatch/faqs/):

> Q: Can I delete any metrics?
> CloudWatch does not support metric deletion.

Metrics are retained for 15 months, so I wondered about whether I would be charged for them for 15 months. However, the following StackOverflow question answered my query: [AWS CloudWatch unused custom metrics retention and pricing](https://stackoverflow.com/questions/48115239/aws-cloudwatch-unused-custom-metrics-retention-and-pricing-2018)

## Resources
