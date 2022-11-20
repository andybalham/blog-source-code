# Enterprise Integration Patterns - Event Design

## Overview

In the first [post](TODO) in the [series](TODO), we took a case study from [Enterprise Integration Patterns: Designing, Building, and Deploying Messaging Solutions](https://www.amazon.co.uk/Enterprise-Integration-Patterns-Designing-Addison-Wesley/dp/0321200683) and looked at how we could implement it using modern serverless technologies. We considered how we could use [SQS](https://aws.amazon.com/sqs/) and [SNS](https://aws.amazon.com/sns/), but decided to use [EventBridge](https://aws.amazon.com/eventbridge/) and a central event bus.

In this post, we look at how we can go about identifying and designing the events that are raised and handled by the application. We consider the structure of the events, how they might evolve, and how we can handle payloads that could be potentially large and could contain sensitive information.

Full working code for this post can be found on the accompanying [GitHub repo](https://github.com/andybalham/blog-enterprise-integration/tree/blog-part-2).

## Case study recap

The case study we looked at is an application that acts as a loan broker. The application receives a request containing the details of the loan required via an API, and then returns the best rate to a [webhook](https://www.getvero.com/resources/webhooks/).

The following diagram shows how we use a central [EventBridge](https://aws.amazon.com/eventbridge/) event bus to implement this.

![Architecture diagram using EventBridge](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/ent-int-patterns-with-serverless-and-cdk/case-study-eventbridge.png?raw=true)

TODO: Look at making this shorter

The event-driven processing of each API request is as follows:

1. The API handler [Lambda function](https://aws.amazon.com/lambda/) publishes a `QuoteSubmitted` event
1. A [Lambda function](https://aws.amazon.com/lambda/) receives the `QuoteSubmitted` event and initiates a [step function](https://aws.amazon.com/step-functions/)
1. The step function publishes a `CreditReportRequested` event and pauses
1. The credit bureau receives the event, obtains the report, and then publishes a `CreditReportReceived` event
1. A Lambda function receives the `CreditReportReceived` event and continues the step function
1. For each registered lender, a `LenderRateRequested` event is published and the step function pauses
1. Each lender receives a `LenderRateRequested` event, and then replies by publishing a `LenderRateReceived` event with their rate
1. When all lenders have responded with `LenderRateReceived` events, the step function continues
1. The best rate is selected and a `QuoteProcessed` event is published with the result
1. A Lambda function receives the `QuoteProcessed` event and calls the [webhook](https://www.getvero.com/resources/webhooks/) with the best rate

## Event identification

Central to an [event-driven architecture](https://aws.amazon.com/event-driven-architecture/) like this are the events themselves. In our example, these are, e.g. `QuoteSubmitted`, `LenderRateReceived`, and so on. They are what I would call domain events, in that they relate purely to the business domain and not the implementation platform.

The identification of events can come out of walking through the process being implemented, or from a more formal process. These processes could be [domain-driven design (DDD)](https://en.wikipedia.org/wiki/Domain-driven_design) or [event storming](https://en.wikipedia.org/wiki/Event_storming).

The key is that all event describe something happened in the past, not that anything should happen in the future. The latter is a request or command, not an event. To paraphrase the [Wikipedia event storming page](https://en.wikipedia.org/wiki/Event_storming), an actor executes a command that results in the creation of a domain event, written in past tense.

## Basic event Structure

Once we have our events, we need to think about how we structure them. This part of the post was very much inspired by the [Amazon EventBridge: Event Payload Standards](https://www.boyney.io/blog/2022-02-11-event-payload-patterns) post by [David Boyne](https://twitter.com/boyney123). I would very much recommend reading that post.

In that post, the following example is given of a standard EventBridge event:

```json
{
    "version": "0",
    "id": "0d079340-135a-c8c6-95c2-41fb8f496c53",
    "detail-type": "OrderCreated",
    "source": "myapp.orders",
    "account": "123451235123",
    "time": "2022-02-01T18:41:53Z",
    "region": "us-west-1",
    "detail": {...} // whatever we like
}
```

To quote the post:

> The `version`, `account`, `time` and `region` are all properties that AWS handles for us. That leaves core properties `detail`, `detail-type` and `source` to be defined by us.

We can populate `detail-type` with the event type, e.g. `QuoteSubmitted` or `LenderRateReceived` in our example, and `source` with a string indicating the origin of the event, e.g. `LoanBroker.CreditBureau`. We could just populate `detail` with just the data for the event. However, there is an advantage to doing something slightly different.

David's post was itself influenced by the [The power of Amazon EventBridge is in its detail](https://medium.com/lego-engineering/the-power-of-amazon-eventbridge-is-in-its-detail-92c07ddcaa40) post by [Sheen Brisals](https://twitter.com/sheenbrisals). In it, Sheen shared with us a pattern of introducing metadata within our `detail` object.

```json
"detail": {
      "metadata": {
        ...
      },
      "data": {
        ...
      }
   }
```

As the [post]((https://medium.com/lego-engineering/the-power-of-amazon-eventbridge-is-in-its-detail-92c07ddcaa40)) points out:

> Implementing these kinds of standards within our events can provide us with some benefits:
>
> - Better filtering of events (we can filter on metadata as well as the event payload)
> - Easier downstream processing based on metadata
> - Opens the doors to more observability patterns and debugging options

Given this, let us define a [TypeScript](https://www.typescriptlang.org/) interface from which we can derive all our domain events.

```TypeScript
export interface DomainEvent<T extends Record<string, any>> {
  readonly metadata: DomainEventMetadata;
  readonly data: T;
}
```

Here we take advantage of TypeScript's support for [generics](https://www.typescriptlang.org/docs/handbook/2/generics.html#handbook-content). This allows us to define the structure of all our events, without tying us to any specific type. All we ask is that the `data` type extends `Record<string, any>`. We ensure this by the use of the `T extends Record<string, any>` [constraint](https://www.typescriptlang.org/docs/handbook/2/generics.html#generic-constraints).

Another TypeScript feature we take advantage of here is having `readonly` properties on our interface. As the post [TypeScript - Interfaces with Read-Only Properties](https://www.logicbig.com/tutorials/misc/typescript/interfaces-with-read-only-properties.html) explains, having these as read-only means that the TypeScript compiler will help us treat the resulting events as immutable. This is important, as events are a record of what has happened and - as we all know - we cannot change the past.

## Metadata structure

Now that we have our basic event structure, we can start to think about the metadata that we want with each event.

TODO: Consider where the event originated...

```TypeScript
export interface EventOrigin {
  readonly domain: EventDomain; // E.g. LoanBroker
  readonly service: EventService; // E.g. CreditBureau
}
```

TODO: Consider how we are going to piece together a picture of what happened...

- [The Value of Correlation IDs](https://www.rapid7.com/blog/post/2016/12/23/the-value-of-correlation-ids/)

```TypeScript
export interface EventContext {
  readonly correlationId: string; // Can be externally provided
  readonly requestId: string; // Always internally generated
}
```

TODO: Put it all together and make it self-contained...

```TypeScript
export interface DomainEventMetadata
  extends EventOrigin, EventContext {
  readonly timestamp: Date; // Keep metadata self-contained
}
```

Now the `detail` for each of our domain events allows us see when it was raised, where it came from, and the context under which it was raised. Although we will be using EventBridge, we are not relying on EventBridge to provide any of the metadata. We could raise the same events through another messaging technology if that was desirable.

## Evolving events with versioning

- [Event-driven architecture at PostNL with Luc van Donkersgoed](https://realworldserverless.com/episode/68)
  - Search for 'an interesting question about versioning.'
- [Build Cloud-Native Apps with Serverless Integration Testing](https://www.youtube.com/watch?v=dT4o_0aVomg)


- [Amazon EventBridge event patterns](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html)
  - TODO: Find out if sophisticated matching is available on `detail-type` or `source`
- [Amazon EventBridge now supports enhanced filtering capabilities](https://aws.amazon.com/about-aws/whats-new/2022/11/amazon-eventbridge-enhanced-filtering-capabilities/)

```TypeScript
export interface EventSchema {
  readonly eventType: EventType; // E.g. QuoteSubmitted
  readonly eventVersion: string; // E.g. 1.0
}
```

```TypeScript
export interface DomainEventMetadata
  extends EventOrigin, EventContext, EventSchema {
  readonly timestamp: Date;
}
```

```TypeScript
export const QUOTE_PROCESSED_PATTERN_V1 = {
  detail: {
    metadata: {
      eventType: [EventType.QuoteProcessed],
      eventVersion: [{ prefix: '1.' }],
    },
  },
};
```

## Passing large and sensitive payloads

- [Using presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- [How to publish large events with Amazon EventBridge using the claim check pattern](https://www.boyney.io/blog/2022-11-01-eventbridge-claim-check)

## Taking advantage of TypeScript

- [Write fewer tests by creating better TypeScript types](https://blog.logrocket.com/write-fewer-tests-by-creating-better-typescript-types)
  - An interface can only extend an object type or intersection of object types with statically known members.
- [Event-driven architecture at PostNL with Luc van Donkersgoed](https://realworldserverless.com/episode/68)

## Event documentation

- Have a look at [EventCatalog](https://www.eventcatalog.dev/)
- EventCatalog is an Open Source project that helps you document your events, services and domains.
- [Using AWS CDK to Deploy EventCatalog](https://matt.martz.codes/using-aws-cdk-to-deploy-eventcatalog)
- [Amazon EventBridge schemas](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-schema.html)
  TODO

## Links

- [The power of Amazon EventBridge is in its detail](https://medium.com/lego-engineering/the-power-of-amazon-eventbridge-is-in-its-detail-92c07ddcaa40)
- [Amazon EventBridge events](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events.html)
