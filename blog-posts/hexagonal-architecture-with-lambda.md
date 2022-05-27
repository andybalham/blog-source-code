## Title: TODO

In this post we look at how we can adopt a hexagonal architecture approach when developing Lambda functions. I am not proposing that this approach is the one true way, but I think it is useful to be aware of the concept and the advantages that it can convey. Even if you do not adopt the approach wholesale, adopting facets of it can be useful in itself. 

## Hexagonal Architecture in a nutshell

Hexagonal architecture is an approach to writing software, where the essence of the problem - the domain - is separated from from the underlying implementation details. 

For example, the problem might involve responding to a customer order by initiating multiple downstream processes. This response might also involve some business rules to determine the parameters passed to those processes. 

In practice the process may be handling an EventBridge event, reading and writing to DynamoDB tables, and then sending SQS messages. With a hexagonal architecture, these implementation details are hidden behind abstractions. This enables the business logic to be expressed in purely business terms. 

For a more in-depth explanation, please see [Hexagonal Architecture, there are always two sides to every story](https://medium.com/ssense-tech/hexagonal-architecture-there-are-always-two-sides-to-every-story-bc0780ed7d9c) and [Hexagonal (Ports & Adapters) Architecture](https://medium.com/idealo-tech-blog/hexagonal-ports-adapters-architecture-e3617bcf00a0).

## Is this really necessary?

You would be quite right at this point to ask the question of whether this level of abstraction is justified. It can be argued that abstracting too early is a trap that many have fallen into. The result being code that has clumsy abstractions or is hard to follow with indirection after indirection. 

In fact, there is a current movement to replace 'classical' coding with 'function-less' coding. This approach uses direct integrations, such a VTL templates in API Gateway or AWS SDK integrations in Step Functions. These are undoubtedly very efficient and have their place. However, such a low-level approach has downsides such as readability and portability.

The post [The trade-offs with functionless integration patterns in serverless architectures](https://serverlessfirst.com/functionless-integration-trade-offs/) covers this topic very well.

After considering the cons, let us now look at our example and see how we can use hexagonal architecture principles. We shall see how it affects the code we write and how we can test it.

## The domain problem

Within our problem domain we have the concept of a customer entity, each of which has a single address. Each customer can have multiple accounts, which are separate entities. Each of these accounts have a correspondence address and a billing address. 

When the address on a customer is updated, an event is raised and the correspondence address on the accounts must be updated in line. The event also contains a flag indicating whether the customer wanted the new address to also update their billing addresses.

## The domain interfaces

A hexagonal approach relies on business-level abstractions. So the first thing we will do is define a set of interfaces for the entities, events, and services in out domain.

TODO: Do we want to use DDD terminology here? Should we just let the code do the talking?
> The `Address` is defined as a [value object](TODO), that is it is an object that only exists in the context of an [entity](TODO). The `Customer` and `AccountDetail` are defined as entities, 

TODO: Add some text to accompany the objects

```typescript
export interface Address {
  lines: string[];
  postalCode: string;
}

export interface Customer {
  customerId: string;
  name: string;
  address: Address;
}

export interface AccountDetail {
  accountDetailId: string;
  customerId: string;
  correspondenceAddress: Address;
  billingAddress: Address;
}
```

TODO: Add some text to accompany the event

```typescript
export interface CustomerUpdatedEvent {
  customerId: string;
  billingUpdateRequested: boolean;
}
```

TODO: Add some text to accompany the services

```typescript
export interface ICustomerStore {
  retrieveCustomerAsync(customerId: string): Promise<Customer | undefined>;
  upsertCustomerAsync(customer: Customer): Promise<void>;
}

export interface IAccountDetailStore {
  listAccountDetailsByCustomerIdAsync(customerId: string): Promise<AccountDetail[]>;
  upsertAccountDetailAsync(accountDetail: AccountDetail): Promise<void>;
}
```

## Implementing the domain service

TODO: I don't like the word 'service' here...

```typescript
export default class AccountUpdater {
  constructor(
    private customerStore: ICustomerStore,
    private accountDetailsStore: IAccountDetailStore
  ) {}

  // TODO: Would this be better named 'handleAsync'?
  // TODO: Should the class be called CustomerUpdatedHandler
  // TODO: In a folder called domain-handlers 
  async updateAccountsAsync(event: CustomerUpdatedEvent): Promise<void> {
    //
    const customer = await this.customerStore.retrieveCustomerAsync(event.customerId);

    if (!customer) {
      const errorMessage = `No customer found for event: ${JSON.stringify(event)}`;
      throw new Error(errorMessage);
    }

    const accountDetails = await this.accountDetailsStore.listAccountDetailsByCustomerIdAsync(
      event.customerId
    );

    const updateAccountDetailPromises = accountDetails.map((ad) => {
      //
      const updatedAccountDetail = { ...ad, correspondenceAddress: customer.address };

      if (event.billingUpdateRequested) {
        updatedAccountDetail.billingAddress = customer.address;
      }

      return this.accountDetailsStore.upsertAccountDetailAsync(updatedAccountDetail);
    });

    const updateAccountDetailResults = await Promise.allSettled(updateAccountDetailPromises);

    const rejectedReasons = updateAccountDetailResults
      .filter((r) => r.status === 'rejected')
      .map((r) => (r as PromiseRejectedResult).reason);

    if (rejectedReasons.length > 0) {
      throw new Error(
        `One or more account detail updates were not processed successfully: ${JSON.stringify({
          rejectedReasons,
        })}`
      );
    }
  }
}
```

## Resources

* [Hexagonal architecture - wikipedia](https://en.wikipedia.org/wiki/Hexagonal_architecture_(software))
* [Hexagonal Architecture, there are always two sides to every story](https://medium.com/ssense-tech/hexagonal-architecture-there-are-always-two-sides-to-every-story-bc0780ed7d9c)
* [Hexagonal (Ports & Adapters) Architecture](https://medium.com/idealo-tech-blog/hexagonal-ports-adapters-architecture-e3617bcf00a0)

* [The trade-offs with functionless integration patterns in serverless architectures](https://serverlessfirst.com/functionless-integration-trade-offs/)