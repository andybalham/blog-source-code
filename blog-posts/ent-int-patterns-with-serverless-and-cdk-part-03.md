# Enterprise Integration Patterns - Domain Observability

## Overview

In the first two parts in this , we first looked at [choosing a messaging technology](TODO) and then looked at how we can [design the domain events](TODO) that flow through the application. In this part, we will look at how we can use those domain events to implement an observability stack. This stack will output a range of business metrics that can be used to provide visibility of the system performance and to alert us when this is not as desired.

The application in question acts as a loan broker, it receives a request containing the details of the loan required via an API, and then returns the best rate to a [webhook](https://www.getvero.com/resources/webhooks/).

The following diagram shows how we use a central [EventBridge](https://aws.amazon.com/eventbridge/) event bus to implement this application using an event-driven design.

![Architecture diagram using EventBridge](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/ent-int-patterns-with-serverless-and-cdk/case-study-eventbridge.png?raw=true)

## Business metrics vs. System metrics

By default, AWS outputs a large number of metrics that you can use to visualise and monitor the health of your application. For example, the [Working with Lambda function metrics](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics.html) AWS documentation page goes into the detail of what is outputted by default by Lambda functions. You get invocation metrics, such as the number of times that your function code is invoked, performance metrics, such as the amount of time that your function code spends processing an event, and concurrency metrics, such as the number of function instances that are processing events.

These provide an invaluable insight into the health of your application, but don't necessarily answer business-level questions such as, "How many quotes are we receiving per hour?", "How fast are we processing them?", or "How many rates are we receiving from lender X?". Whilst AWS provides system metrics, to answer these business-level questions we need business metrics.

This is where we can take advantage of our event-driven architecture. The application is already producing events such as the following:

- TODO: Event list

What we can do is subscribe to these events and translate them into custom business metrics. We can then build dashboards, alarms, and whatever else we want on top of those metrics.

## Decoupling observability

In the first part of the [series](TODO), we considered using [SQS](TODO) as part of our messaging technology. One limitation of SQS is that each message can only be processed by one consumer. Our use of EventBridge has the advantage that we can subscribe to any business events without affecting any existing processing. This means we can add an observability stack entirely independently of the existing application. This demonstrates the high-level of decoupling that can be achieved and the extensibility you get with an event-driven architecture.

The diagram below shows how we are going add business observability to our architecture. As you can see, it simply plugs into the event bus.

![Architecture diagram with observability added](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/ent-int-patterns-with-serverless-and-cdk/case-study-observability.png?raw=true)

## Simple logging and Logs Insights

One simple way to turn the business events into a searchable resource is to log our business events in a [structured way](https://stackify.com/what-is-structured-logging-and-why-developers-need-it/). This can be done via the following single-line Lambda function.

```TypeScript
export const handler = async (
  event: EventBridgeEvent<'DomainEventBase', DomainEventBase>
): Promise<void> => {
  console.log({ ...event.detail.metadata, data: event.detail.data });
};
```

This will result in log entries such as the following.

```json
{
  "eventType": "QuoteSubmitted",
  "eventVersion": "1.0",
  "correlationId": "ac702216-ac35-48cb-be3c-26beb523897e",
  "requestId": "35fb604e-c56b-457b-97a8-fbdae9fd0644",
  "eventId": "8e71aecb-839f-4477-a9db-5353e1f23d04",
  "domain": "LoanBroker",
  "service": "RequestApi",
  "timestamp": "2023-01-28T15:05:16.237Z",
  "data": {
    "quoteReference": "2023-01-28-RHJ9YUL71",
    "quoteRequestDataUrl": "https://requestapistack-requestapibucket...-Amz-SignedHeaders=host"
  }
}
```

We have flattened the metadata about the event, such as the correlation id and event type, and also included the actual data for the event, such as the quote reference. In the second part of the [series](TODO), we designed our domain events to be self-contained and to be made up from metadata about the event and the event data itself. We are taking advantage of the consistency here to output an easily searchable entry.

We also made another choice when designing out domain events. That was to pass large or sensitive data as time-limited [presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html). This choice means that we are free to log the events without the risk of logging sensitive information by accident.

Now we have our structured logging Lambda function, we can look at how we hook it up to monitor our application. To do this we create a [CDK construct](https://docs.aws.amazon.com/cdk/v2/guide/constructs.html) as shown below.

```TypeScript
export interface ObserverProps {
  loanBrokerEventBus: EventBus;
}

export default class Observer extends Construct {
  constructor(scope: Construct, id: string, props: ObserverProps) {
    super(scope, id);

    const loggerFunction = new NodejsFunction(this, 'Logger');

    const domainEventRule = new Rule(this, id, {
      eventBus: props.loanBrokerEventBus,
      eventPattern: {
        detail: {
          metadata: {
            domain: [EventDomain.LoanBroker],
          },
        },
      },
    });

    domainEventRule.addTarget(new LambdaFunction(loggerFunction));
}
```

The construct properties allow us to pass in the event bus to subscribe to. We create our Lambda function, along with a rule that will listen to all domain events in the application. Finally, we add our Lambda function as the target for the rule.

The final step is to define a stack and add it to the application.

```TypeScript
export interface ObservabilityStackProps extends StackProps {
  loanBrokerEventBus: EventBus;
}

export default class ObservabilityStack extends Stack {
  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props);

    new Observer(this, 'Observer', {
      loanBrokerEventBus: props.loanBrokerEventBus,
    });
  }
}

new ObservabilityStack(app, 'ObservabilityStack', {
  loanBrokerEventBus: messagingStack.loanBrokerEventBus,
});
```

With this Lambda function in place, we can now use CloudWatch logs to see all the domain events in a single place.

![Unfiltered CloudWatch log showing business events](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/ent-int-patterns-with-serverless-and-cdk/cloudwatch-event-log-unfiltered.png?raw=true)

We can take advantage of [log filtering](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html#matching-terms-events) to provide a more focussed view of the events.

![Filtered CloudWatch log showing just business events](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/ent-int-patterns-with-serverless-and-cdk/cloudwatch-event-log-filtered.png?raw=true)

However, we can do even better by using [CloudWatch Logs Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AnalyzingLogData.html). To quote the article:

> CloudWatch Logs Insights enables you to interactively search and analyze your log data in Amazon CloudWatch Logs. You can perform queries to help you more efficiently and effectively respond to operational issues. If an issue occurs, you can use CloudWatch Logs Insights to identify potential causes and validate deployed fixes.

This allows us to run a query such as the following and get a picture of the domain events flowing through the system.

![A basic Logs Insights query](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/ent-int-patterns-with-serverless-and-cdk/log-insights-query.png?raw=true)

![Results from a basic Logs Insights query](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/ent-int-patterns-with-serverless-and-cdk/log-insights-results.png?raw=true)

As we log correlation ids, we can use these when we want to focus in on a particular request by adding criteria to our queries. The query below show how this is done.

![Logs Insights query for a specific request id](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/ent-int-patterns-with-serverless-and-cdk/log-insights-query-with-request-id.png?raw=true)

![Results from a Logs Insights query for a specific request id](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/ent-int-patterns-with-serverless-and-cdk/log-insights-results-for-request-id.png?raw=true)

## Logging business metrics

TODO: Recording business metrics using power tools

TODO: Describe Lambda function

```TypeScript
import { Metrics, MetricUnits } from '@aws-lambda-powertools/metrics';

export const METRICS_NAMESPACE = 'LoanBroker';
export const METRICS_SERVICE_NAME = 'observer';
export const CREDIT_REPORT_FAILED_METRIC = 'creditReportFailed';

const metrics = new Metrics({
  namespace: METRICS_NAMESPACE,
  serviceName: METRICS_SERVICE_NAME,
});
```

TODO: Describe logging of metric

```TypeScript
const publishCreditReportFailedMetrics = (
  creditReportFailed: CreditReportFailedV1
): void => {
  metrics.addMetric(CREDIT_REPORT_FAILED_METRIC, MetricUnits.Count, 1);

  addMetadata(creditReportFailed, {
    quoteReference: creditReportFailed.data.quoteReference,
    error: creditReportFailed.data.error,
    executionId: creditReportFailed.data.executionId,
    executionStartTime: creditReportFailed.data.executionStartTime,
    stateMachineId: creditReportFailed.data.stateMachineId,
  });

  metrics.publishStoredMetrics();
};
```

TODO: Describe handler

```TypeScript
export const handler = async (
  event: EventBridgeEvent<'DomainEventBase', DomainEventBase>
): Promise<void> => {

  switch (event.detail.metadata.eventType) {
    case EventType.CreditReportFailed:
      publishCreditReportFailedMetrics(event.detail as CreditReportFailedV1);
      break;
    default:
      break;
  }
};
```

TODO: Show metrics in the console

TODO: Add an alarm to alert

```TypeScript
const creditReportFailedCount = new Metric({
  namespace: OBSERVER_NAMESPACE,
  metricName: CREDIT_REPORT_FAILED_METRIC,
  dimensionsMap: {
    service: OBSERVER_SERVICE_NAME,
  },
}).with({
  statistic: 'sum',
  period: Duration.minutes(5),
});

creditReportFailedCount.createAlarm(this, 'CreditReportFailedAlarm', {
  evaluationPeriods: 1,
  comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
  threshold: 0,
  treatMissingData: TreatMissingData.NOT_BREACHING,
});
```

TODO: Show alert in the console

## Deriving business metrics

- Adding an event log to enable durations to be calculated
- Adding error events and alarms

Q. How much of the code do we want to show?

## Summary

TODO

## Links

TODO
