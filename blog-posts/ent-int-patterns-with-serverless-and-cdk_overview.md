# What are the parts going to be about?

## Part 1: Messaging Choice

- Introduction to the book
- Outline the business problem
- Mention the example uses MSMQ, ask the question about serverless
- Talk about [sns vs sqs vs EventBridge](https://duckduckgo.com/?t=ffab&q=aws+sns+vs+sqs+vs+eventbridge&ia=web)

  - [AWS — Difference between Amazon EventBridge and Amazon SNS](https://medium.com/awesome-cloud/aws-difference-between-amazon-eventbridge-and-amazon-sns-comparison-aws-eventbridge-vs-aws-sns-46708bf5313)
  - [Lumigo - Choosing the right event-routing service for serverless: EventBridge, SNS, or SQS](https://lumigo.io/blog/choosing-the-right-event-routing-on-aws-eventbridge-sns-or-sqs/)
  - [Lumigo - 5 reasons why you should use EventBridge instead of SNS](https://lumigo.io/blog/5-reasons-why-you-should-use-eventbridge-instead-of-sns/)

- [Serverless Messaging: Latency Compared](https://bitesizedserverless.com/bite/serverless-messaging-latency-compared/)

## Event Design

- Identification
  - [Domain-driven design (DDD)](https://en.wikipedia.org/wiki/Domain-driven_design)
  - [Event storming](https://en.wikipedia.org/wiki/Event_storming)

- Structure
  - [Amazon EventBridge: Event Payload Standards](https://www.boyney.io/blog/2022-02-11-event-payload-patterns)
  - [Amazon EventBridge event patterns](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html)
  - [Amazon EventBridge now supports enhanced filtering capabilities](https://aws.amazon.com/about-aws/whats-new/2022/11/amazon-eventbridge-enhanced-filtering-capabilities/)

- Passing data
  - [Using presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
  - [How to publish large events with Amazon EventBridge using the claim check pattern](https://www.boyney.io/blog/2022-11-01-eventbridge-claim-check)

- Versioning
  - [Event-driven architecture at PostNL with Luc van Donkersgoed](https://realworldserverless.com/episode/68)
  - Search for 'an interesting question about versioning.'
  - [Build Cloud-Native Apps with Serverless Integration Testing](https://www.youtube.com/watch?v=dT4o_0aVomg)

- Taking advantage of TypeScript
  - [Write fewer tests by creating better TypeScript types](https://blog.logrocket.com/write-fewer-tests-by-creating-better-typescript-types)
  - An interface can only extend an object type or intersection of object types with statically known members.
  - [TypeScript - Interfaces with Read-Only Properties](https://www.logicbig.com/tutorials/misc/typescript/interfaces-with-read-only-properties.html)

- Have a look at [EventCatalog](https://www.eventcatalog.dev/)
  - EventCatalog is an Open Source project that helps you document your events, services and domains.
  - [Using AWS CDK to Deploy EventCatalog](https://matt.martz.codes/using-aws-cdk-to-deploy-eventcatalog)


### `jest.config.js`

We needed to add this to allow the use of `crypto.randomUUID()`.

```javascript
  globals: {
    crypto: {
      randomUUID: () => require('crypto').randomUUID(),
    },
  },
```

## Testing

- [Serverless integration testing with the AWS CDK](https://www.10printiamcool.com/series/integration-test-with-cdk)
- Highlight how it is straightforward to implement mock functions with an event-driven architecture

## Observability, error handling, and idempotency

- Adding a follow-up event to check that the quote was processed (maybe for a later post)
  - https://docs.aws.amazon.com/scheduler/latest/UserGuide/what-is-scheduler.html
  - https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html#one-time
  - https://dev.to/kumo/9-surprises-using-aws-eventbridge-scheduler-13b6
  - https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Scheduler.html#createSchedule-property
- Add a dashboard (maybe for a another post)

- [Amazon EventBridge Scheduler](https://aws.amazon.com/eventbridge/scheduler/?trk=1dda356d-fbf2-4372-8247-d1aad644af59)
  - Could we use this to schedule a check that we processed a quote?
- Hooking into domain events
  - Building up a list of events
- Metrics and dashboard
- [AWS Distro for OpenTelemetry](https://aws.amazon.com/otel/?otel-blogs.sort-by=item.additionalFields.createdDate&otel-blogs.sort-order=desc)
- DLQs: [Event retry policy and using dead-letter queues](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-dlq.html)
- [Amazon SQS delay queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-delay-queues.html)
  - To monitor whether we process all requests
- [Logging and dashboards using Lambda PowerTools and CDK](https://markilott.medium.com/aws-lambda-powertools-b74baa36ac61)
- [CloudWatch Dashboards as Code (the Right Way) Using AWS CDK](https://medium.com/poka-techblog/cloudwatch-dashboards-as-code-the-right-way-using-aws-cdk-1453309c5481)
- [Create AWS CloudWatch Dashboard With AWS CDK](https://www.milangatyas.com/Blog/Detail/12/create-aws-cloudwatch-dashboard-with-aws-cdk)
- [class Dashboard (construct)](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-cloudwatch.Dashboard.html)
- [evb-cli: Pattern generator and debugging tool for EventBridge](https://www.npmjs.com/package/@mhlabs/evb-cli)
- [How to Use AWS X-Ray to Monitor and Trace an Event-Driven Architecture on AWS](https://blog.guilleojeda.com/how-to-use-aws-x-ray-to-monitor-and-trace-an-event-driven-architecture-on-aws)