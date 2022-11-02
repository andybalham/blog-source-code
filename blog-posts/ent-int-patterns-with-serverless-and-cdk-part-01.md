# Enterprise Integration Patterns with Serverless and CDK

Choosing our messaging technology

## Overview

If you are interested in [Event-Driven Architecture (EDA)](https://aws.amazon.com/event-driven-architecture/) then I would highly recommend you reading [Enterprise Integration Patterns: Designing, Building, and Deploying Messaging Solutions](https://www.amazon.co.uk/Enterprise-Integration-Patterns-Designing-Addison-Wesley/dp/0321200683). Although published first in 2003, this book contains a catalogue of sixty-five messaging patterns still relevant today. Maybe even more so, given the ease of building with such patterns today. It also explores in detail the advantages and limitations of asynchronous messaging architectures.

TODO: Think of better phrase than 'case study'

The book also includes some case studies and their implementation. However, this is where the age of the book shows, as this snippet from the Amazon brief indicates:

> The authors also include examples covering a variety of different integration technologies, such as **JMS, MSMQ, TIBCO ActiveEnterprise, Microsoft BizTalk, SOAP, and XSL**.

In this series of blog posts, we will look at one of the example case studies from the book and implement it using [AWS](https://aws.amazon.com/) serverless services and [CDK](https://aws.amazon.com/cdk/).

Full working code for this post can be found on the accompanying [GitHub repo](https://github.com/andybalham/blog-enterprise-integration/tree/blog-part-1).

## The Loan Broker case study

The case study we will look at is an application that acts as a loan broker. The application receives a request containing the details of the loan required, along with details of the individual wanting the loan. The application then interacts with a credit bureau to obtain a credit report for the individual. The loan details plus the credit report are then sent to multiple lenders, who each submit their best rates. The application then selects the best rate and publishes the result.

![Case study overview](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/ent-int-patterns-with-serverless-and-cdk/case-study.png?raw=true)

As the diagram above shows, all the interactions are asynchronous and message-based. The diagram also refers to a number of the patterns listed in the book. The 'Recipient List' pattern indicates the use of a list of registered lenders when sending the rate requests. The 'Aggregator' pattern indicates that the multiple responses are aggregated into one. Finally, the 'Translator' pattern indicates that the aggregated response is to be transformed into a different representation for the outside world.

Next we will consider a couple of alternative implementations using AWS serverless services. First up, using [SQS](https://aws.amazon.com/sqs/) and [SNS](https://aws.amazon.com/sns/).

## SQS / SNS implementation

[SQS](https://aws.amazon.com/sqs/) and [SNS](https://aws.amazon.com/sns/) are two complimentary messaging services that together can be used to create complex event-driven architectures. 

SNS is a point-to-point messaging technology and SQS a publish-and-subscribe event technology. These feel a natural fit to implement the patterns above. With SQS providing the queues and SNS providing the fan-out to the lenders. This is shown in the diagram below which is a close replication of the original Loan Broker application diagram.

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

We can take the previous architecture and replace both SQS and SNS with a single EventBridge event bus. The resulting architecture is shown below:

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

## Comparing the two approaches

Let me start by saying that both approaches have the potential to be good solutions to the problem. Both approaches decouple all the Lambda functions by using messaging. This can help with both testing and scaling.

However, there are a number of key differences between the technologies:

- SQS and SNS support ordered events, EventBridge does not
- SQS delivers 'at most once', SNS and EventBridge deliver 'at least once'
- EventBridge supports content-based filtering, SNS only supports attribute-based filtering

For more information on the difference, I recommend the following articles:

- [Difference between Amazon EventBridge and Amazon SNS](https://medium.com/awesome-cloud/aws-difference-between-amazon-eventbridge-and-amazon-sns-comparison-aws-eventbridge-vs-aws-sns-46708bf5313)
- [Choosing the right event-routing service for serverless: EventBridge, SNS, or SQS](https://lumigo.io/blog/choosing-the-right-event-routing-on-aws-eventbridge-sns-or-sqs/)

What strikes me about the two architecture diagrams is that the EventBridge approach puts the event bus at the centre of the architecture. With the SQS/SNS approach, the Loan Broker appears as the centre. I also noted that when explaining the sequence, the EventBridge approach centred around the publishing and receiving of domain events, whilst with the SQS/SNS approach, the explanation had to refer to specific queues and topics.

Out of the box, I can see observability advantages with the SQS/SNS approach. That is, we could use the AWS console to see how many messages were in flight at any time. This could allow us to see if things were getting backed up at any point. We would have some potentially useful control points too. We could also pause any part of the system by throttling the number of Lambda function executions. This would result in messages queuing up, but not being lost. The 'at most once' delivery would also help with ensuring [idempotency](https://www.restapitutorial.com/lessons/idempotency.html), without any additional effort on our part.

So given all these positives, why am I going to choose the EventBridge approach to implement? It is partly that I wanted to get some hands-on experience with implementing domain events with EventBridge (see note below). It is also that the domain event driven approach allows us to extend the system without impacting the current behaviour. This is because new components can subscribe to and process the events independently.

The result can be downloaded from the accompanying [GitHub repo](https://github.com/andybalham/blog-enterprise-integration/tree/blog-part-1).

> CV Driven Design (CDD) is the approach of building systems based on technology that the architects want on their CVs. Please do not do this in commercial software. Please challenge the use of any technology and ensure that its use is justified, given the available alternatives.

## Summary

In this post, we looked at an example case study from [Enterprise Integration Patterns: Designing, Building, and Deploying Messaging Solutions](https://www.amazon.co.uk/Enterprise-Integration-Patterns-Designing-Addison-Wesley/dp/0321200683) and how we can use AWS serverless technologies to implement it. We considered using a combination of SQS and SNS, and then compared that solution with one that used EventBridge. We decided upon implementing it using EventBridge.

In the next part, we will look at the process of designing our events and how we pass data between the components that make up our application.

## Further reading

- [5 reasons why you should use EventBridge instead of SNS](https://lumigo.io/blog/5-reasons-why-you-should-use-eventbridge-instead-of-sns/)
