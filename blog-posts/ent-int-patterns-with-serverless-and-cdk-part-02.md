# Enterprise Integration Patterns - Event Design

## Overview

In the first [post](https://aws.hashnode.com/enterprise-integration-patterns-with-serverless-and-cdk) in the [series](https://aws.hashnode.com/series/enterprise-patterns-cdk), we took a case study from [Enterprise Integration Patterns: Designing, Building, and Deploying Messaging Solutions](https://www.amazon.co.uk/Enterprise-Integration-Patterns-Designing-Addison-Wesley/dp/0321200683) and looked at how we could implement it using modern serverless technologies. We considered how we could use [SQS](https://aws.amazon.com/sqs/) and [SNS](https://aws.amazon.com/sns/), but decided to use [EventBridge](https://aws.amazon.com/eventbridge/) and a central event bus.

In this post, we look at how we can go about identifying and designing the events that are raised and handled by the application. We consider the structure of the events, how they might evolve, and how we can handle payloads that could be potentially large and could contain sensitive information.

Full working code for this post can be found on the accompanying [GitHub repo](https://github.com/andybalham/blog-enterprise-integration/tree/blog-part-2).

## Case study recap

The case study we looked at is an application that acts as a loan broker. The application receives a request containing the details of the loan required via an API, and then returns the best rate to a [webhook](https://www.getvero.com/resources/webhooks/).

The following diagram shows how we use a central [EventBridge](https://aws.amazon.com/eventbridge/) event bus to implement this.

![Architecture diagram using EventBridge](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/ent-int-patterns-with-serverless-and-cdk/case-study-eventbridge.png?raw=true)

The event-driven processing of each API request is as follows:

1. The API handler publishes a `QuoteSubmitted` event
1. The `QuoteSubmitted` event is handled and initiates a [step function](https://aws.amazon.com/step-functions/)
1. The step function publishes a `CreditReportRequested` event and pauses
1. The `CreditReportRequested` event is handled, and then a `CreditReportReceived` event is published
1. The `CreditReportReceived` event is handled and the step function continues
1. For each registered lender, a `LenderRateRequested` event is published and the step function pauses
1. Each `LenderRateRequested` event is handled, and a `LenderRateReceived` event is published
1. When all lenders have responded, the step function continues
1. The best rate is selected and a `QuoteProcessed` event is published with the result
1. The `QuoteProcessed` event is handled and the [webhook](https://www.getvero.com/resources/webhooks/) is called with the best rate

## Event identification

Central to an [event-driven architecture](https://aws.amazon.com/event-driven-architecture/) like this are the events themselves. In our example, these are, e.g. `QuoteSubmitted`, `LenderRateReceived`, and so on. They are what I would call domain events, in that they relate purely to the business domain and not the implementation platform.

The identification of events can come out of walking through the process being implemented, or from a more formal process. These processes could be [domain-driven design (DDD)](https://en.wikipedia.org/wiki/Domain-driven_design) or [event storming](https://en.wikipedia.org/wiki/Event_storming).

The key is that all event describe something happened in the past, not that anything should happen in the future. The latter is a request or command, not an event. To paraphrase the [Wikipedia event storming page](https://en.wikipedia.org/wiki/Event_storming), an actor executes a command that results in the creation of a __domain event__, written in __past tense__.

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

The first class of information relates to where the event originated. In this case, we split the information into the service that raised it and the domain which the service is part of. In our case study we have a single domain, `LoanBroker`, but several services, with the `CreditBureau` being one. We group this using a TypeScript interface as follows.

```TypeScript
export interface EventOrigin {
  readonly domain: EventDomain; // E.g. LoanBroker
  readonly service: EventService; // E.g. CreditBureau
}
```

Why would we want to include this information? One reason is to enhance observability when we log such events. In becomes clear where the information has come from. Another reason, as we will see in a later post, is that we can add listeners to all events from either a particular service or a particular domain. Again, this can help with observability.

On the subject of observability, one of the challenges of event-driven systems is building up a picture of the flow of a request through the system. One way to do this is to use correlation and request ids.

Every call into our application will pass both a correlation and a request id in each event. The correlation id can be externally-specified, but the request id will be generated for each call. Using a correlation id in this way, allows our application to be tracked as part in longer-running sagas. For example, if a call was retried, then it may use the same correlation id. This would allow us to piece together that the two requests were related.

With all this is mind, we create an `EventContext` interface with our ids.

```TypeScript
export interface EventContext {
  readonly correlationId: string; // Can be externally provided
  readonly requestId: string; // Always internally generated
}
```

Now we put these interfaces together, along with a timestamp. An EventBridge event does automatically get a timestamp, but we include one here to make out metadata self-contained. If we use another transport for the event detail, then we will still have this very useful information.

```TypeScript
export interface DomainEventMetadata
  extends EventOrigin, EventContext {
  readonly timestamp: Date; // Keep metadata self-contained
}
```

Now the `detail` for each of our domain events allows us see when it was raised, where it came from, and the context under which it was raised. Although we will be using EventBridge, we are not relying on EventBridge to provide any of the metadata. We could raise the same events through another messaging technology if that was desirable.

## Evolving events with versioning

If there is one constant, it is change. Systems evolve over time, so it is important to bear this in mind when building them. 

In the case of events, we may want to add information to them over time. In general, this will be a safe thing to do. However, this is if we know that all downstream systems accept new properties and do not rely on this new value. This puts the emphasis on us to write forgiving consumers of events. 

However, it may be the case that at some point we need to fundamentally change the structure of an event. How can we do this without breaking something? With a distributed system, we are not able stop everything. We also might have old events in-flight awaiting processing. So what can we do?

TODO

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

## Summary

TODO

## Links

[The Value of Correlation IDs](https://www.rapid7.com/blog/post/2016/12/23/the-value-of-correlation-ids/)
- [The power of Amazon EventBridge is in its detail](https://medium.com/lego-engineering/the-power-of-amazon-eventbridge-is-in-its-detail-92c07ddcaa40)
- [Amazon EventBridge events](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events.html)
