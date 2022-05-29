## Hexagonal Architecture with CDK, Lambda, and TypeScript

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

## The domain objects

A hexagonal approach relies on business-level abstractions. So the first thing we will do is define a set of interfaces for the entities, events, and services in out domain.

TODO: Do we want to use DDD terminology here? Should we just let the code do the talking?
> The `Address` is defined as a [value object](TODO), that is it is an object that only exists in the context of an [entity](TODO). The `Customer` and `AccountDetail` are defined as entities, 

The main two objects in our domain are the customer and their account details. In [DDD](TODO) terminology, these are both entities in that they have an identity and a lifecycle, i.e. they can change over time.

```typescript
export class Customer {
  customerId: string;
  name: string;
  address: Address;
}

export class AccountDetail {
  accountDetailId: string;
  customerId: string;
  correspondenceAddress: Address;
  billingAddress: Address;
}
```

The address object, on the other hand, is a [value object](TODO). That is, it has no identity of its own and never changes.

```typescript
export class Address {
  lines: string[];
  postalCode: string;
}
```

The event simply contains the id of the customer updated and whether or not they requested that their billing addresses be updated. 

```typescript
export class CustomerUpdatedEvent {
  customerId: string;
  billingUpdateRequested: boolean;
}
```

Finally, we define the services that our hexagonal code will use. In this case, these comprise two data stores. One for the customer data and one for the account detail data. These differ from the previous objects in that they are abstract. That is, they do not include any references to how we are going to implement them.

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

## Implementing the domain handler

TODO: Go through the following implementation

Now that we have the domain objects defined, we can move on to the implementation of the handler class.

We start by specify in the constructor that we require two data stores. We use the interface definitions to isolate our handler from the underlying implementation details.

```typescript
export default class CustomerUpdatedHandler {
  constructor(
    private customerStore: ICustomerStore,
    private accountDetailsStore: IAccountDetailStore
  ) {}
}
```

Next we define the `handleAsync` method that will handle the event.

```typescript
async handleAsync(event: CustomerUpdatedEvent): Promise<void> {
}
```

The first thing the method needs to do is to retrieve the customer. We are careful to throw an informative error if none is found.

```typescript
//
const customer = await this.customerStore.retrieveCustomerAsync(
  event.customerId
);

if (!customer) {
  throw new Error(`No customer found for id: ${event.customerId}`);
}
```

Next we retrieve all the account details for the customer and build up an array of promises containing the updates required. Note how the code is able to express the logic in purely business terms.

```typescript
const accountDetails =
  await this.accountDetailsStore.listAccountDetailsByCustomerIdAsync(
    event.customerId
  );

const updateAccountDetailPromises = accountDetails.map((ad) => {
  //
  const updatedAccountDetail = {
    ...ad,
    correspondenceAddress: customer.address,
  };

  if (event.billingUpdateRequested) {
    updatedAccountDetail.billingAddress = customer.address;
  }

  return this.accountDetailsStore.upsertAccountDetailAsync(
    updatedAccountDetail
  );
});
```

Finally, we use the `Promise.allSettled` method to perform the updates and we check the results in case any failed. If so, we throw an error to ensure these do not go unnoticed.

```typescript
const updateAccountDetailResults = await Promise.allSettled(
  updateAccountDetailPromises
);

const rejectedReasons = updateAccountDetailResults
  .filter((r) => r.status === 'rejected')
  .map((r) => (r as PromiseRejectedResult).reason as string);

if (rejectedReasons.length > 0) {
  throw new Error(
    `One or more updates were not processed: ${rejectedReasons.join(', ')}`
  );
}
```

## Testing the handler logic

TODO: Go through a test, highlighting how easy it is.

## Implementing the Lambda function

TODO: What do we say about `CustomerStore` and `AccountDetailStore`?

TODO: 

```typescript
import DomainHandler from '../domain-handlers/CustomerUpdatedHandler';

const domainHandler = new DomainHandler(
  new CustomerStore(process.env['CUSTOMER_TABLE_NAME']),
  new AccountDetailStore(process.env['CUSTOMER_TABLE_NAME'])
);
```

TODO

```typescript
export const handler = async (event: SNSEvent): Promise<void> => {
  //
  const accountUpdaterFunctionPromises = event.Records.map((r) => {
    const customerUpdatedEvent = JSON.parse(
      r.Sns.Message
    ) as CustomerUpdatedEvent;
    return domainHandler.handleAsync(customerUpdatedEvent);
  });

  const accountUpdaterFunctionResults = await Promise.allSettled(
    accountUpdaterFunctionPromises
  );

  const rejectedReasons = accountUpdaterFunctionResults
    .filter((r) => r.status === 'rejected')
    .map((r) => (r as PromiseRejectedResult).reason as string);

  if (rejectedReasons.length > 0) {
    throw new Error(
      `One or more updates were not processed: ${rejectedReasons.join(', ')}`
    );
  }
};
```

## TODO

Is this as far as we go?

Do we want to go through the construct?

## Resources

* [Hexagonal architecture - wikipedia](https://en.wikipedia.org/wiki/Hexagonal_architecture_(software))
* [Hexagonal Architecture, there are always two sides to every story](https://medium.com/ssense-tech/hexagonal-architecture-there-are-always-two-sides-to-every-story-bc0780ed7d9c)
* [Hexagonal (Ports & Adapters) Architecture](https://medium.com/idealo-tech-blog/hexagonal-ports-adapters-architecture-e3617bcf00a0)

* [The trade-offs with functionless integration patterns in serverless architectures](https://serverlessfirst.com/functionless-integration-trade-offs/)