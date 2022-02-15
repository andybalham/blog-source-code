# Instrumenting Lambda functions using custom metrics

The `aws-embedded-metrics` npm package makes it straightforward

## Overview

TODO

## TL;DR

- Custom metrics allow you to instrument your application
- The `aws-embedded-metrics` npm package makes it straightforward to add them
- A knowledge of dimensions, metrics, and properties is essential

## What are CloudWatch metrics?

The AWS documentation ([Using Amazon CloudWatch metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/working_with_metrics.html)) describes metrics as follows:

> Metrics are data about the performance of your systems. By default, many services provide free metrics for resources. You can also enable detailed monitoring for some resources or publish your own application metrics. Amazon CloudWatch can load all the metrics in your account (both AWS resource metrics and application metrics that you provide) for search, graphing, and alarms.

For Lambda functions, AWS is already collecting the following metrics and more automatically for you:

- Invocations
- Duration
- Timeouts
- Errors

As mentioned in the documentation, these metrics can searched, graphed, and alerted on.

For example, here are a couple of graphs showing total invocations and average duration:

TODO: Generate the graphs

These metrics can be very useful to set alarms on. For example, it is important to know if your application is suffering from timeouts, excessive errors, or throttling. All these can be alerted on with the built-in metrics.

## Introducing custom metrics

These default metrics are very useful to understand and monitor the health of your application, but they can only go so far. What if you wanted to monitor the health or performance of an external API? What if you also wanted to be able to query the performance for a particular request or particular response? Well, with custom metrics, you can do all of these things.

The AWS user guide ([Publishing custom metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/publishingMetrics.html)) says the following:

> You can publish your own metrics to CloudWatch using the AWS CLI or an API. You can view statistical graphs of your published metrics with the AWS Management Console.

This all sounds great, but how can you create custom metrics for a Lambda function?

If you are developing in Nodejs, then one answer is the Amazon CloudWatch Embedded Metric Format Client Library ([`awslabs/aws-embedded-metrics-node`](https://github.com/awslabs/aws-embedded-metrics-node)). This npm package takes advantage of the embedded metric format to generate CloudWatch Metrics via structured log events.

The AWS documentation on the [embedded metric format](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format.html) describes it as follows:

> Embedded metric format helps you to generate actionable custom metrics from ephemeral resources such as Lambda functions and containers. By using the embedded metric format to send logs from these ephemeral resources, you can now easily create custom metrics without having to instrument or maintain separate code, while gaining powerful analytical capabilities on your log data.

Essentially, by logging in a specific format CloudWatch automatically extracts the custom metrics for you. The `awslabs/aws-embedded-metrics-node` package makes this straightforward to do.

## Our example - TODO: Better name for this section?

Our example consists of a mock API endpoint and a Lambda function that calls it. The mock API endpoint is made up of an API Gateway, backed by a Lambda function, and a Lambda function that calls the endpoint using the `axios` npm package.

TODO: Diagram of our proxy function calling the mock API.

The Lambda function behind the mock API has a set of environment variables that allow us to configure the response time and the error rate. This will enable us to get some more interesting metrics when we test.

The first question we need to answer is what information do we want. In this case, we want to be able to graph the average duration of the HTTP calls and the total number of HTTP errors. To do this we need two metrics, the response time and whether an error occurred.

## Instrumenting our example

Below is the code starting point for our example. It simply uses the `axios` `post` method to get a response, and then logs the response status and response time.

```TypeScript
const callEndpointAsync = async (
  request: CreditReferenceRequest
): Promise<AxiosResponse<CreditReferenceResponse>> => {

  if (endpointUrl === undefined) throw new Error('endpointUrl === undefined');

  const startTime = Date.now();

  function getResponseTime(): number {
    return Date.now() - startTime;
  }

  try {
    const response = await axios.post<
      CreditReferenceResponse,
      AxiosResponse<CreditReferenceResponse>,
      CreditReferenceRequest
    >(`${endpointUrl}request`, request);

    const responseTime = getResponseTime();

    console.log(JSON.stringify({ status: response.status, responseTime }, null, 2));

    return response;

  } catch (error: any) {
    const responseTime = getResponseTime();
    console.log(JSON.stringify({ status: error.response?.status, responseTime }, null, 2));
    throw error;
  }
};
```

The `aws-embedded-metrics` library allows a number of different [usages](https://github.com/awslabs/aws-embedded-metrics-node#usage). In this case, we are going to wrap our function in a `metricScope` so that the metrics will get flushed automatically for us. The documentation has the following snippet.

```typescript
const { metricScope } = require('aws-embedded-metrics');

const myFunc = metricScope((metrics) => async () => {
  // ...
});

exports.handler = myFunc;
```

So our example becomes:

```typescript
const callEndpointAsync = metricScope(
  (metrics) =>
    async (
      request: CreditReferenceRequest,
    ): Promise<AxiosResponse<CreditReferenceResponse>> => {
      // ...as before...
    },
);
```

We now have a `metrics` instance to use to publish our custom metrics. For the happy path we do this as shown below:

```typescript
const response = await axios.post<
  CreditReferenceResponse,
  AxiosResponse<CreditReferenceResponse>,
  CreditReferenceRequest
>(`${endpointUrl}request`, request);

const responseTime = getResponseTime();

// Record our metrics
metrics.putDimensions({ Service: 'CreditReferenceGateway' });
metrics.putMetric('ResponseTime', responseTime, Unit.Milliseconds);
metrics.setProperty('ResponseStatus', response.Status);
metrics.setProperty('CorrelationId', request.correlationId);
metrics.setProperty('RequestId', request.requestId);
```

TODO: Should we just use dimensions and metrics, and leave properties to another post?

You can see here that metrics are made up of three types of values, that is dimensions, metrics, and properties. Knowledge of what these types are are a key to getting the results you want and avoiding accidental costs.

## Dimensions, Metrics, and Properties

TODO

## Generating, viewing, and deleting metrics

TODO

Explain the test harness.

Do a series of runs with different mock configurations.

Show graph of duration and error counts.

Show query for a property.

## Deleting metrics

- [Amazon CloudWatch FAQs](https://aws.amazon.com/cloudwatch/faqs/) Q: Can I delete any metrics?
  > CloudWatch does not support metric deletion. Metrics expire based on the retention schedules described above.

## Summary

TODO

## Resources

TODO

- [Amazon CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/)
- [Publishing custom metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/publishingMetrics.html)
- [Amazon CloudWatch FAQs](https://aws.amazon.com/cloudwatch/faqs/)

## Notes

Q. Should we set a namespace?

```TypeScript
// in process
const { Configuration } = require("aws-embedded-metrics");
Configuration.namespace = "Namespace";

// environment
AWS_EMF_NAMESPACE=Namespace
```

Thought? Could you use alarms to build a circuit-breaker?
https://medium.com/@ch.gerkens/circuit-breaker-solution-for-aws-lambda-functions-5264cb59031f
