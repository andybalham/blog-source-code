## What did we learn?

This becomes the `TL;DR`.

* Lambda layers are immutable
* `esbuild` will bundle code not in excluded modules
   * Need to bundle manually
* Can use paths in `tsconfig`
* Can use SSM parameters to deploy updates with no rebuild

Conclusion, npm better for most use cases of reuse.

## Notes

This is a good article [AWS Lambda Use Cases: When to use Lambda layers](https://lumigo.io/blog/lambda-layers-when-to-use-it/)

What is the story that we want to tell?

1. Hexagonal architecture with Lambda functions
   - Pass dependencies into the function class
   - Would this just be for TypeScript? Yes - for us.
1. Move data layer to Lambda layer
   - What is the best strategy for packaging `aws-sdk`?
   -
1. Deployment strategies for Lambda layers
   - Manually update the ARN
   - Use SSM to store the ARN on update and retrieve on deployment

Questions

- What about testing...
  - ...the functionality in a Lambda layer?
  - ...the functionality that uses a Lambda layer?
    - Can we download the layer and unzip it locally?
- Can we have step function that updates all Lambda function that use a Lambda layer?
  - I.e., can we recognise what Lambda function use a layer and update them to the latest?

What application are we going to build?

- We need a Store? What could be in it?
- Do we need more than one Lambda function? No, over-complicated.
- What is the Lambda function going to do?
  - Should it interact with more than one Store?
  - What business functionality could it do?

What is the progression that we want to show:

1. Lambda function with direct SDK usage
1. Lambda function with injected service

   - Demonstrate easier unit testing

1. Convert service to Lambda layer in same stack
1. Show how to test using Jest

1. Move Lambda layer a separate stack
1. Unit test layer functionality? Integration test?
1. Use SSM for simpler deployment (step function?)

1. Download layer for local unit testing

So, the plan is for a Lambda function that does the following:

- Triggered by `CustomerUpdatedEvent` containing a `customerId`
- Call `ICustomerStore.loadAsync` to get `Customer`
- Call `IAccountStore.listByCustomerIdAsync` to get `Account[]`
- Update all `Account.address` with `Customer.address`
- Call `IAccountStore.saveBatchAsync` with updated `Account[]`

> Q. Should there be a domain layer somewhere?

> Q. How would that work with layers?

We will have the following stacks:

- `DataStorageStack` containing:
  - `CustomerTable`
  - `AccountTable`
  - Q. Could this set SSM parameters to be used on deployment?
- `DataAccessLayerStack` containing:
  - Data access models:
    - `Customer`
    - `Address`
    - `Account`
  - Repositories:
    - `CustomerStore`
    - `AccountStore`
- `ApplicationStack` containing:
   - `CustomerUpdateHandler` CDK construct
   - `AccountUpdaterFunction` Lambda function

Code structure?
```
\src
   \cdk-app.ts (DataStorageStack and ApplicationStack)
   \data-storage
      \DataStorageStack.ts (export names of SSM params and env variables)
      \CustomerTable.ts (construct)
      \AccountTable.ts (construct)
   \data-access (to be turned into a layer later)
      \DataAccessStack.ts (outputs a layer and sets SSM parameters)
      \CustomerStore.ts
      \AccountStore.ts
   \domain-contracts (pure interface)
      \events.ts (CustomerUpdated)
      \models.ts (Customer, Address, and Account)
      \services.ts (ICustomerStore, IAccountStore)
   \application
      \ApplicationStack.ts (use SSM parameters for table names)
      \  
      \CustomerUpdatedHandler.AccountUpdaterFunctionV1.ts (with all code in it)
      \CustomerUpdatedHandler.AccountUpdaterFunctionV2.ts (using domain-contracts and data-access)
\test
   \cdk-app-test.ts (CustomerStoreTestStack, AccountStoreTestStack and CustomerUpdatedHandlerTestStack)
   \application
      \CustomerUpdatedHandler.AccountUpdaterFunction.test.ts
         - Jest-based unit tests mocking the repositories
      \CustomerUpdatedHandlerTestStack.ts (use table constructs from data-storage?)
         - Use Table constructs from data-storage
         - Have a test SNS topic to trigger the function
      \CustomerUpdatedHandler.test.ts
   \data-access
      \CustomerStoreTestStack.ts
      \CustomerStore.test.ts
      \AccountStoreTestStack.ts
      \AccountStore.test.ts
```