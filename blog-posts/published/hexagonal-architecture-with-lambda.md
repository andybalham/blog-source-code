## Hexagonal Architecture with CDK, Lambda, and TypeScript

In this post we look at how we can adopt a hexagonal architecture approach when developing Lambda functions. I am not proposing that this approach is the one true way, but I think it is useful to be aware of the concept and the advantages that it can convey. Even if you do not embrace the approach wholesale, adopting some facets of it can be useful in itself.

## Hexagonal Architecture in a nutshell

Hexagonal architecture is an approach to writing software, where the essence of the problem - the domain - is separated from from the underlying implementation details.

For example, the problem might involve responding to a customer order by initiating multiple downstream processes. This response might also involve some business rules to determine the parameters passed to those processes.

In practice the process may be handling an EventBridge event, reading and writing to DynamoDB tables, and then sending SQS messages. With a hexagonal architecture, these implementation details are hidden behind abstractions. This enables the business logic to be expressed in purely business terms.

In our case, we are going to be implementing a Lambda function that hosts the business logic as follows:

![Hexagonal Lambda overview](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/hexagonal-architecture-with-lambda/hexagonal-lambda.png?raw=true)

The Lambda function will take care of mapping the AWS-specific inputs to the business domain logic. It will also provide AWS-specific services that use interfaces to isolate the logic from the implementation details.

For a more in-depth explanation, please see [Hexagonal Architecture, there are always two sides to every story](https://medium.com/ssense-tech/hexagonal-architecture-there-are-always-two-sides-to-every-story-bc0780ed7d9c) and [Hexagonal (Ports & Adapters) Architecture](https://medium.com/idealo-tech-blog/hexagonal-ports-adapters-architecture-e3617bcf00a0).

## Is this really necessary?

You would be quite right at this point to ask the question of whether this level of abstraction is justified. It can be argued that abstracting too early is a trap that many have fallen into. The result being code that has clumsy abstractions or is hard to follow with indirection after indirection.

In fact, there is a current movement to replace 'classical' coding with 'function-less' coding. This approach uses direct integrations, such a VTL templates in API Gateway or AWS SDK integrations in Step Functions. These are undoubtedly very efficient and have their place. However, such a low-level approach has downsides such as readability and portability.

The post [The trade-offs with functionless integration patterns in serverless architectures](https://serverlessfirst.com/functionless-integration-trade-offs/) covers this topic very well.

After considering the cons, let us now look at our example and see how we can use hexagonal architecture principles. We shall see how it affects the code we write and how we can test it.

## The business problem

Within our business domain we have the concept of a customer entity, each of which has a single address. Each customer can have multiple accounts, which are separate entities. Each of these accounts have a correspondence address and a billing address.

When the address on a customer is updated, an event is raised and the correspondence address on the accounts must be updated in line. The event also contains a flag indicating whether the customer wanted the new address to also update their billing addresses.

## The domain objects

A hexagonal approach relies on business-level abstractions. So the first thing we will do is define the entities, events, and services in our business domain.

The main two objects in our business domain are the customer and their account details. In [domain-driven design](https://en.wikipedia.org/wiki/Domain-driven_design) terminology, these are both [entities](https://blog.jannikwempe.com/domain-driven-design-entities-value-objects) in that they have an identity and a lifecycle, i.e. they can change over time.

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

The address object, on the other hand, is a [value object](https://blog.jannikwempe.com/domain-driven-design-entities-value-objects). That is, it has no identity of its own and never changes.

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
  listAccountDetailsByCustomerIdAsync(
    customerId: string
  ): Promise<AccountDetail[]>;
  upsertAccountDetailAsync(accountDetail: AccountDetail): Promise<void>;
}
```

## Implementing the business logic

Now that we have the domain objects defined, we can move on to implementing the business logic in a handler class.

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

The first thing the `handleAsync` method needs to do is to retrieve the customer. Here we use the `ICustomerStore` that was passed in to the constructor.

```typescript
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
  .filter((r) => r.status === "rejected")
  .map((r) => (r as PromiseRejectedResult).reason as string);

if (rejectedReasons.length > 0) {
  throw new Error(
    `One or more updates were not processed: ${rejectedReasons.join(", ")}`
  );
}
```

## Testing the business logic

One of the advantages of adopting a hexagonal approach is the ease of testing business logic. We can use our favourite mocking tool to supply mocks for the services and avoid having to mock AWS services or provide local simulated services.

In our case, we are using the [Jest](https://jestjs.io/) testing framework and its in-built mocking. Before each test we provide a default mock implementation of the two store interfaces.

```TypeScript
let customerStoreMock: ICustomerStore;
let accountDetailStoreMock: IAccountDetailStore;

beforeEach(() => {
  customerStoreMock = {
    retrieveCustomerAsync: jest.fn(),
    upsertCustomerAsync: jest.fn(),
  };

  accountDetailStoreMock = {
    listAccountDetailsByCustomerIdAsync: jest.fn(),
    upsertAccountDetailAsync: jest.fn(),
  };
});
```

Now we have our base mocks, we can create the boilerplate for our first test scenario.

```TypeScript
it('handles no accounts', async () => {

  // Arrange

  // Act

  // Assert

});
```

Our 'arrange' step involves creating our test data, mocking the store methods, and then creating the handler passing in the mock implementations.

```TypeScript
const testCustomerId = 'TestCustomerId';

const testCustomer: Customer = {
  customerId: testCustomerId,
  name: 'Test Customer',
  address: {
    lines: ['Line1', 'Line2'],
    postalCode: 'PostalCode',
  },
};

customerStoreMock.retrieveCustomerAsync = jest
  .fn()
  .mockResolvedValue(testCustomer);
accountDetailStoreMock.listAccountDetailsByCustomerIdAsync = jest
  .fn()
  .mockResolvedValue([]);

const accountUpdaterFunction = new CustomerUpdatedHandler(
  customerStoreMock,
  accountDetailStoreMock
);
```

Now that we have our handler, we can call the `handleAsync` method in our 'act' step.

```TypeScript
await accountUpdaterFunction.handleAsync({
  customerId: testCustomerId,
  billingUpdateRequested: false,
});
```

Our 'assert' step is similarly simple, using the Jest expectations to verify the calls made.

```TypeScript
expect(customerStoreMock.retrieveCustomerAsync).toBeCalledWith(
  testCustomerId
);

expect(
  accountDetailStoreMock.listAccountDetailsByCustomerIdAsync
).toBeCalledWith(testCustomerId);

expect(accountDetailStoreMock.upsertAccountDetailAsync).toBeCalledTimes(0);
```

This simple example shows how the separation of implementation from business logic can make testing the latter easier. The accompanying [GitHub repo](https://github.com/andybalham/blog-hexagonal-lambda-functions) contains more examples of business logic tests.

## Implementing the Lambda function

Now that we have verified the business logic, we can look at how we can use it in the context of a Lambda function. The first thing to do is to instantiate it with concrete implementations for the `ICustomerStore` and `IAccountDetailStore`.

```typescript
import DomainHandler from "../domain-handlers/CustomerUpdatedHandler";

const domainHandler = new DomainHandler(
  new CustomerStore(process.env["CUSTOMER_TABLE_NAME"]),
  new AccountDetailStore(process.env["CUSTOMER_TABLE_NAME"])
);
```

I won't go into the actual implementation of `CustomerStore` and `AccountDetailStore` here, but they can be found in the accompanying [repo](https://github.com/andybalham/blog-hexagonal-lambda-functions). The repo also contains examples of how the service implementations themselves can be tested independently.

With the instance of the domain handler, we write the Lambda function handler. The function takes care of translating the `SNSEvent` objects into domain events, which are then despatched to the domain handler `handleAsync` method.

```typescript
export const handler = async (event: SNSEvent): Promise<void> => {

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
    .filter((r) => r.status === "rejected")
    .map((r) => (r as PromiseRejectedResult).reason as string);

  if (rejectedReasons.length > 0) {
    throw new Error(
      `One or more updates were not processed: ${rejectedReasons.join(", ")}`
    );
  }
};
```

Here we can see that there is a clear separation of responsibilities, with the Lambda function handler hiding the AWS service details from the domain handler. We can also see potential for making such a handler generic, as the business logic is hidden from it.

## Summary

In this post, we saw how we can structure our TypeScript Lambda functions using hexagonal architecture principles to isolate the business logic from the AWS service details. This gives advantages in testability and portability, amongst others. 

However, this approach does come at the expense of additional levels of abstraction, which many might find unnecessary for their scale of application. In my experience, I have found that the bigger the application, the more need for structure. The trick is knowing how big that is, and it is surprisingly easy to reach that limit.

## Resources

- [Hexagonal architecture - wikipedia](<https://en.wikipedia.org/wiki/Hexagonal_architecture_(software)>)
- [Hexagonal Architecture, there are always two sides to every story](https://medium.com/ssense-tech/hexagonal-architecture-there-are-always-two-sides-to-every-story-bc0780ed7d9c)
- [Hexagonal (Ports & Adapters) Architecture](https://medium.com/idealo-tech-blog/hexagonal-ports-adapters-architecture-e3617bcf00a0)

- [The trade-offs with functionless integration patterns in serverless architectures](https://serverlessfirst.com/functionless-integration-trade-offs/)
