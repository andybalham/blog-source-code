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
