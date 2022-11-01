# What are the parts going to be about?

## Part 1: Messaging Choice

- Introduction to the book
- Outline the business problem
- Mention the example uses MSMQ, ask the question about serverless
- Talk about [sns vs sqs vs EventBridge](https://duckduckgo.com/?t=ffab&q=aws+sns+vs+sqs+vs+eventbridge&ia=web)
  - [AWS — Difference between Amazon EventBridge and Amazon SNS](https://medium.com/awesome-cloud/aws-difference-between-amazon-eventbridge-and-amazon-sns-comparison-aws-eventbridge-vs-aws-sns-46708bf5313)
  - [Lumigo - Choosing the right event-routing service for serverless: EventBridge, SNS, or SQS](https://lumigo.io/blog/choosing-the-right-event-routing-on-aws-eventbridge-sns-or-sqs/)
  - [Lumigo - 5 reasons why you should use EventBridge instead of SNS](https://lumigo.io/blog/5-reasons-why-you-should-use-eventbridge-instead-of-sns/)

## Event Design

- Structure
  - [Amazon EventBridge: Event Payload Standards](https://www.boyney.io/blog/2022-02-11-event-payload-patterns)
- Passing data
  - [Using presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)

## Testing

- [Serverless integration testing with the AWS CDK](https://www.10printiamcool.com/series/integration-test-with-cdk)

## Observability, error handling, and idempotency

- Hooking into domain events
  - Building up a list of events
- Metrics and dashboard
- DLQs: [Event retry policy and using dead-letter queues](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-dlq.html)
- [Amazon SQS delay queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-delay-queues.html)
  - To monitor whether we process all requests
