## Adventures with Lambda layers and CDK

In this post, I will recount my experience of trying out Lambda layers with a small project. It proved to be a good way to get an understanding of what Lambda layers are, how they are used, what their limitations might be, and when they could be useful.

All the code in this post can be downloaded and run by cloning the [companion repo](https://github.com/andybalham/blog-hexagonal-lambda-layers).

## TL;DR

TODO: revisit this

- Lambda layers are immutable
- `esbuild` will bundle code not in excluded modules
  - Need to bundle manually
- Can use paths in `tsconfig`
- Can use SSM parameters to deploy updates with no rebuild

Conclusion, npm better for most use cases of reuse.

## The starting point

In a previous [post](TODO), I created a Lambda function that used a hexagonal architecture approach. The following diagram shows how we abstracted the implementation of the data stores from the domain logic.

![Lambda function with hexagonal architecture](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/hexagonal-lambda-layers/hexagonal-lambda.png?raw=true)

This separation made me wonder whether it might be an interesting thing to try to package these data stores as a Lambda layer. The intended result is shown below.

![Lambda function with Lambda layer](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/hexagonal-lambda-layers/hexagonal-lambda-with-layer.png?raw=true)

## Packaging and deploying the layer

The folder structure I chose is shown below. The layer contents are in the `layer\nodejs` folder. The `*Store*` files contain the data store classes which are in turn exported by the `data-access` file. There is a convention at play here, as for Node.js layers to work, the code must be in a `nodejs` folder.

The `DataAccessLayer` file contains the [CDK](https://aws.amazon.com/cdk/) construct that will be used to deploy it.

![Layer source folder structure](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/hexagonal-lambda-layers/layer-src-folders.png?raw=true)

The `DataAccessLayer` construct is shown in full below

```TypeScript
export default class DataAccessLayer extends Construct {
  //
  static readonly LAYER_ARN_SSM_PARAMETER = '/layer-arn/data-access';

  readonly layer: ILayerVersion;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.layer = new LayerVersion(this, 'DataAccessLayer', {
      compatibleRuntimes: [Runtime.NODEJS_12_X, Runtime.NODEJS_14_X],
      code: Code.fromAsset(
        path.join(__dirname, `/../../dist/src/data-access/layer`)
      ),
      description: 'Provides data access clients',
    });

    new StringParameter(this, 'DataAccessLayerArnSsmParameter', {
      parameterName: DataAccessLayer.LAYER_ARN_SSM_PARAMETER,
      stringValue: this.layer.layerVersionArn,
      description: 'The ARN of the latest Data Access layer',
      type: ParameterType.STRING,
      tier: ParameterTier.STANDARD,
    });
  }
}
```

The `LayerVersion` construct uses the `Code.fromAsset` method to point to the output from the TypeScript compiler (the `dist` subfolders). Note that it points to the parent folder of the `nodejs` folder.

Lambda layers have a version number, which is incremented each time it is deployed. As part of this construct we create an [SSM Parameter](TODO) to store the latest version. We will use this later on when deploying dependent components.

Now that we have our construct, we can create a stack to deploy it.

```TypeScript
export default class DataAccessStack extends Stack {
  //
  constructor(scope: Construct, id: string, props?: DataAccessStackProps) {
    super(scope, id, props);

    const dataAccessLayer = new DataAccessLayer(this, 'DataAccessLayer');

    new CfnOutput(this, 'DataAccessLayerArn', {
      value: dataAccessLayer.layer.layerVersionArn,
    });
  }
}
```

## Compiling against the layer

TODO

```TypeScript
import { AccountDetailStore, CustomerStore } from '/opt/nodejs/data-access';
```

TODO

```json
{
  "compilerOptions": {
    /* Snip */
    "paths": {
      "/opt/nodejs/data-access": ["src/data-access/layer/nodejs/data-access"]
    }
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

TODO

## Packaging the Lambda

TODO

```TypeScript
export interface CustomerUpdatedProps {
  dataAccessLayerArn: string;
  customerUpdatedTopic: ITopic;
  customerTableName: string;
  accountDetailTableName: string;
}

export default class CustomerUpdatedHandler extends Construct {
  constructor(scope: Construct, id: string, props: CustomerUpdatedProps) {
    super(scope, id);

    // Snip - getting tables

    const dataAccessLayer = LayerVersion.fromLayerVersionArn(
      this,
      'DataAccessLayer',
      props.dataAccessLayerArn
    );

    const customerUpdatedHandlerFunction = new Function(
      scope,
      'CustomerUpdatedHandlerFunction',
      {
        runtime: Runtime.NODEJS_14_X,
        handler: 'CustomerUpdatedHandlerFunction.handler',
        code: new AssetCode(
          path.join(
            __dirname,
            `/../../dist/src/application/customer-updated-handler-function`
          )
        ),
        environment: {
          [ENV_VAR_CUSTOMER_TABLE_NAME]: props.customerTableName,
          [ENV_VAR_ACCOUNT_DETAIL_TABLE_NAME]: props.accountDetailTableName,
        },
        layers: [dataAccessLayer],
      }
    );

    // Snip - adding subscriptions and permissions
  }
}
```

TODO

```TypeScript
export default class ApplicationStack extends Stack {
  constructor(scope: Construct, id: string, props?: ApplicationStackProps) {
    super(scope, id, props);

    // Snip - creating topic and getting table name parameters

    const dataAccessLayerArnSsmParameter =
      StringParameter.fromStringParameterName(
        this,
        'DataAccessLayerArnSsmParameter',
        DataAccessLayer.LAYER_ARN_SSM_PARAMETER
      );

    new CustomerUpdatedHandler(this, 'CustomerUpdatedHandler', {
      dataAccessLayerArn: dataAccessLayerArnSsmParameter.stringValue,
      customerUpdatedTopic,
      customerTableName: customerTableNameParameter.stringValue,
      accountDetailTableName: accountDetailTableNameParameter.stringValue,
    });
  }
}
```

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
