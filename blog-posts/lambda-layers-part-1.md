What do we want to put in the lambda layer?

The idea was to have a data access layer:

```TypeScript

```

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

- We need a repository? What could be in it?
- Do we need more than one Lambda function? No, over-complicated.
- What is the Lambda function going to do?
  - Should it interact with more than one repository?
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
- Call `ICustomerRepository.loadAsync` to get `Customer`
- Call `IAccountRepository.listByCustomerIdAsync` to get `Account[]`
- Update all `Account.address` with `Customer.address`
- Call `IAccountRepository.saveBatchAsync` with updated `Account[]`

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
    - `CustomerRepository`
    - `AccountRepository`
- `ApplicationStack` containing:
   - `CustomerUpdateHandler` CDK construct
   - `AccountUpdaterFunction` Lambda function

Code structure?
```
\src
   \cdk-app.ts
   \data-storage
      \DataStorageStack.ts (export names of SSM params and env variables)
      \CustomerTable.ts (construct)
      \AccountTable.ts (construct)
   \data-access (to be turned into a layer later)
      \models.ts (Customer, Address, and Account)
      \CustomerRepository.ts
      \AccountRepository.ts
   \application
      \CustomerUpdateHandler.ts
      \CustomerUpdateHandler.AccountUpdaterFunction.ts
\test
   \application
      \CustomerUpdateHandlerTestStack.ts (use table constructs from data-storage?)
      ??? How would this work ??? 
      If the data access layer relies on a GSI, then our test stack would need it.
```