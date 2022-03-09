# Application observability with custom metric alerts

Do we want to set up the alarm via the console or via CDK?

It will be more interesting to see how we can create the alarm via CDK.

## Overview
TODO
Talk about the last post, but say what do we do with the information.

The answer is alerts!

## TL;DR
TODO

## Headings

* The application
* The metrics
* The alarms
* The CDK
* The testing

## Notes

Need to understand this:
* https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html

* https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-cloudwatch.Metric.html#class-metric
* https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-cloudwatch.Metric.html#createwbralarmscope-id-props
* https://docs.aws.amazon.com/cdk/api/v1/docs/aws-cloudwatch-readme.html#alarms
* https://docs.aws.amazon.com/cdk/v1/guide/how_to_set_cw_alarm.html

What will the follow-up be called?

Further adventures in Lambda custom metrics

- Properties?
- Querying CloudWatch insights?
- Multiple dimensions? SaaS example?
- Pricing?
- Deleting
- Namespaces?


## Notes

Standard vs High-resolution metrics?

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


You may wonder how to delete a metric. Well, once created, a metric cannot be explicitly deleted. As explained by the [Amazon CloudWatch FAQs](https://aws.amazon.com/cloudwatch/faqs/):

> Q: Can I delete any metrics?
> CloudWatch does not support metric deletion.

Metrics are retained for 15 months, so I wondered about whether I would be charged for them for 15 months. However, the following StackOverflow question answered my query: [AWS CloudWatch unused custom metrics retention and pricing](https://stackoverflow.com/questions/48115239/aws-cloudwatch-unused-custom-metrics-retention-and-pricing-2018)
