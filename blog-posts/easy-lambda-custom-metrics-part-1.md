# Instrumenting Lambda functions using custom metrics
The `aws-embedded-metrics` npm package makes it straightforward

## Overview

TODO

## TL;DR

* Custom metrics allow you to instrument your application
* The `aws-embedded-metrics` npm package makes it straightforward to add them
* A knowledge of dimensions, metrics, and properties is essential

## What are CloudWatch metrics?

TODO

Explain that CloudWatch metrics are automatically recorded by AWS for your Lambda functions.

[Using Amazon CloudWatch metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/working_with_metrics.html)

Show some example graphs for duration and invocations.

Mention that you can set alarms on these metrics.

## Introducing custom metrics

TODO

[Publishing custom metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/publishingMetrics.html)

> You can publish your own metrics to CloudWatch using the AWS CLI or an API. You can view statistical graphs of your published metrics with the AWS Management Console.

But how can you create custom metrics for a Lambda function?

One answer is [awslabs/aws-embedded-metrics-node](https://github.com/awslabs/aws-embedded-metrics-node), the Amazon CloudWatch Embedded Metric Format Client Library.

## Our example - TODO: Better name for this section?

TODO

Diagram of our proxy function calling the mock API.

Explain that the mock API can be configured with random responses and response times.

Lay out what we want to record, i.e. average duration and error counts

## Dimensions, Metrics, and Properties

TODO

## Instrumenting our example

TODO

> To get a metric logger, you can either decorate your function with a metricScope, or manually create and flush the logger.

Show how we decorate with `metricScope`

## Generating and viewing test metrics

TODO

Explain the test harness.

Do a series of runs with different mock configurations.

Show graph of duration and error counts.

Show query for a property.

## Deleting metrics

* [Amazon CloudWatch FAQs](https://aws.amazon.com/cloudwatch/faqs/) Q: Can I delete any metrics?
> CloudWatch does not support metric deletion. Metrics expire based on the retention schedules described above.

## Summary

TODO

## Resources

TODO
* [Amazon CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/)
* [Publishing custom metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/publishingMetrics.html)
* [Amazon CloudWatch FAQs](https://aws.amazon.com/cloudwatch/faqs/)

## Notes

Q. Should we set a namespace?

```TypeScript
// in process
const { Configuration } = require("aws-embedded-metrics");
Configuration.namespace = "Namespace";

// environment
AWS_EMF_NAMESPACE=Namespace
```
