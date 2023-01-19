# Enterprise Integration Patterns - Domain Observability

## Overview

In the first two parts in this [series](TODO), we first looked at [choosing a messaging technology](TODO) and then looked at how we can [design the domain events](TODO) that flow through the application. In this part, we will look at how we can use those domain events to implement an observability stack. This stack will output a range of business metrics that can be used to provide visibility of system performance and to alert when this is not as desired.

The application in question acts as a loan broker, it receives a request containing the details of the loan required via an API, and then returns the best rate to a [webhook](https://www.getvero.com/resources/webhooks/).

The following diagram shows how we use a central [EventBridge](https://aws.amazon.com/eventbridge/) event bus to implement this.

![Architecture diagram using EventBridge](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/ent-int-patterns-with-serverless-and-cdk/case-study-eventbridge.png?raw=true)

## Business metrics vs. System metrics

By default, AWS outputs a large number of metrics that you can use to visualise and monitor the health of your application. For example, the [Working with Lambda function metrics](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics.html) AWS documentation page goes into the detail of what is outputted by default by Lambda functions. You get invocation metrics, such as the number of times that your function code is invoked, performance metrics, such as the amount of time that your function code spends processing an event, and concurrency metrics, such as the number of function instances that are processing events.

These provide an invaluable insight into the health of your application, but don't necessarily answer business-level questions such as, "How many quotes are we receiving per hour?" or "How many rates are we receiving for lender X?". Whilst AWS provides system metrics, to answer these business-level questions we need business metrics.

This is where we can take advantage of our event-driven architecture. The application is already producing events such as the following:

- TODO: Event list

What we can do is subscribe to these events and translate them into custom business metrics. We can then build dashboards, alarms, and whatever else we want on top of those metrics.

## Decoupling observability

![Architecture diagram with observability added](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/ent-int-patterns-with-serverless-and-cdk/case-study-observability.png?raw=true)

TODO: How an EDA approach allows observability to be implemented in a decoupled way

## Simple logging and Application Insights

TODO: Simple logging approach, coupled with Application Insights

## Logging business metrics

TODO: Recording business metrics using power tools
TODO: Add an alarm to alert

## Deriving business metrics

- Adding an event log to enable durations to be calculated
- Adding error events and alarms

## Summary

TODO

## Links

TODO
