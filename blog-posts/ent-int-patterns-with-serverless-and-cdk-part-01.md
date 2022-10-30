# Enterprise Integration Patterns with Serverless and CDK

Choosing our messaging technology

## Overview

If you are interested in [Event-Driven Architecture (EDA)](https://aws.amazon.com/event-driven-architecture/) then I would highly recommend you reading [Enterprise Integration Patterns: Designing, Building, and Deploying Messaging Solutions](https://www.amazon.co.uk/Enterprise-Integration-Patterns-Designing-Addison-Wesley/dp/0321200683). Although published first in 2003, this book contains a catalogue of sixty-five messaging patterns still relevant today. Maybe even more so, given the ease of building with such patterns today. It also explores in detail the advantages and limitations of asynchronous messaging architectures.

TODO: Think of better phrase than 'case study'

The book also includes some case studies and their implementation. However, this is where the age of the book shows, as this snippet from the Amazon brief indicates:

> The authors also include examples covering a variety of different integration technologies, such as **JMS, MSMQ, TIBCO ActiveEnterprise, Microsoft BizTalk, SOAP, and XSL**.

In this series of blog posts, we will look at one of the example case studies from the book and implement it using [AWS](https://aws.amazon.com/) serverless services and [CDK](https://aws.amazon.com/cdk/).

## The Loan Broker case study

The case study we will look at is an application that acts as a loan broker. The application receives a request containing the details of the loan required, along with details of the individual wanting the loan. The application then interacts with a credit bureau to obtain a credit report for the individual. The loan details plus the credit report are then sent to multiple lenders, who each submit their best rates. The application then selects the best rate and publishes the result.

![Case study overview](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/ent-int-patterns-with-serverless-and-cdk/case-study.png?raw=true)

As the diagram above shows, all the interactions are asynchronous and message-based. The diagram also refers to a number of the patterns listed in the book. The 'Recipient List' pattern indicates the use of a list of registered lenders when sending the rate requests. The 'Aggregator' pattern indicates that the multiple responses are aggregated into one. Finally, the 'Translator' pattern indicates that the aggregated response is to be transformed into a different representation for the outside world.

Next we will consider a couple of alternative implementations using AWS serverless services. First up, using [SQS](https://aws.amazon.com/sqs/) and [SNS](https://aws.amazon.com/sns/).

## SQS / SNS implementation

[SQS](https://aws.amazon.com/sqs/) and [SNS](https://aws.amazon.com/sns/) are two complimentary messaging services that together can be used to create complex event-driven architectures. The diagram below shows how they can be combined to build our Loan Broker application.

![Architecture diagram using SQS and SNS](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/ent-int-patterns-with-serverless-and-cdk/case-study-sns-sqs.png?raw=true)

The sequence of events is as follows:

1. The API puts a message to be processed on the SQS request queue
1. A [Lambda function](https://aws.amazon.com/lambda/) consumes the request message from the queue and initiates a [step function](https://aws.amazon.com/step-functions/)
1. The step function places a message on a credit report SQS request queue and pauses
1. The credit bureau places a message on the credit report SQS response queue
1. A Lambda function consumes the response message and continues the step function
1. For each registered lender, an SNS message is published to a rate request topic and the step function pauses
1. Each lender has an SQS queue subscribed to rate request topic, filtered by their lender identifier
1. The lender consumes the rate request and places a message on the rate response SQS queue
1. When all lenders have responded, the step function continues
1. The best rate is selected and a message is placed on the SQS response queue
1. A Lambda function consumes the response message and calls the [webhook](https://www.getvero.com/resources/webhooks/) with the best rate

## EventBridge implementation

AWS describes [EventBridge](https://aws.amazon.com/eventbridge/) as follows:

> Amazon EventBridge is a serverless event bus that lets you receive, filter, transform, route, and deliver events. 

We can take the previous architecture and replace both SQS and SNS with a single EventBridge event bus. The result is shown below:

![Architecture diagram using EventBridge](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/ent-int-patterns-with-serverless-and-cdk/case-study-eventbridge.png?raw=true)

The sequence of events is very similar to before, but all communication is through events sent and received through the central event bus:

1. The API publishes a `QuoteSubmitted` event
1. A [Lambda function](https://aws.amazon.com/lambda/) receives the Quote Submitted event and initiates a [step function](https://aws.amazon.com/step-functions/)
1. The step function publishes a `CreditReportRequested` event and pauses
1. The credit bureau receives the event, obtains the report, and then publishes a `CreditReportReceived` event
1. A Lambda function receives the `CreditReportReceived` event and continues the step function
1. For each registered lender, a `LenderRateRequested` event is published and the step function pauses
1. Each lender receives a `LenderRateRequested` event, and then replies by publishing a `LenderRateReceived` event with their rate
1. When all lenders have responded, the step function continues
1. The best rate is selected and a `QuoteProcessed` event is published with the result
1. A Lambda function receives the `QuoteProcessed` event and calls the [webhook](https://www.getvero.com/resources/webhooks/) with the best rate

## Comparing the two implementations

TODO: Mention the following articles:

- [Medium - Difference between Amazon EventBridge and Amazon SNS](https://medium.com/awesome-cloud/aws-difference-between-amazon-eventbridge-and-amazon-sns-comparison-aws-eventbridge-vs-aws-sns-46708bf5313)
- [Lumigo - Choosing the right event-routing service for serverless: EventBridge, SNS, or SQS](https://lumigo.io/blog/choosing-the-right-event-routing-on-aws-eventbridge-sns-or-sqs/)
- [Lumigo - 5 reasons why you should use EventBridge instead of SNS](https://lumigo.io/blog/5-reasons-why-you-should-use-eventbridge-instead-of-sns/)
