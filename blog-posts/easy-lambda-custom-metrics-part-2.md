
What will the follow-up be called?

Further adventures in Lambda custom metrics

- Properties?
- Querying CloudWatch insights?
- Multiple dimensions? SaaS example?
- Pricing?
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
