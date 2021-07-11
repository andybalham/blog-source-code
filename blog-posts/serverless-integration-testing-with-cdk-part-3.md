In [Part 1](TODO) and [Part 2](TODO) of this series, we looked at how we could take a serverless application and group it into a set of testable [CDK constructs](TODO). In this part, I look into how we can refine the approach to make it as simple as possible to write and run tests in this way.

## Quick Recap

We started with our event-driven application architecture, where files added to an S3 bucket cause a ripple of events.

![affordability-full.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1622902599565/z0Ozk5FJQ.jpeg)

We then grouped the application into a set of [CDK constructs](TODO). These CDK constructs can be deployed and tested in isolation and are shown by the shaded boxes below.

![affordability-grouped.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1623089346147/se6bw9clw1.jpeg)

We took the `Event publisher` construct first and got to a point where we could run a unit test to trigger the processing and observe the results in a repeatable way.

![test-aws-cli.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1624556357457/0yaAQLIDr.jpeg)

## Observations from the first two parts

- Calling the AWS CLI is clunky.
  - The approach relied on invoking the AWS CLI via the `child_process` package. Looking at the code for [AWS Testing Library](https://github.com/erezrokah/aws-testing-library), I could see that it is possible to call the AWS services directly using the AWS SDK and use the credentials loaded from from the Shared Credentials File as described [here](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html).
- This approach to testing will require similar scaffolding infrastructure for each construct being tested.
  - For example, a function to act as an observer of events and a table to record the observable outputs from the test.
- The unit tests need to know the names of the deployed resources.
  - The approach relied on the deployment outputting the resource names for use in the tests, either by hardcoding or by passing them in by some other mechanism. As we are following the best practise and not specifying resource names, this adds a extra step each time they change as result of a deployment.

## Unit test client & Integration test stack

With these observations in mind, enter the `Integration test stack` and the `Unit test client`.

The `Integration test stack` is an abstract [CDK `Stack`](TODO) class that provides the following functionality:

- Deployment of common test resource scaffolding, such as an observer function and a test output table.
- A method to tag the deployed resources so that they can be discovered without needing to know the resource names or ARNs.

The `Unit test client` is a class that works in conjunction with the `Integration test stack` and provides the following:

- A set of methods to locate and interact with test resources using the [AWS SDK](TODO). For example, upload an object to an S3 bucket.
- A method that encapsulates the polling of the test outputs.

Using these two classes our test architecture becomes the following, with a generic `Test observer` function and a generic `Integration test` table being provided by the `Integration test stack` and our unit tests using the `Unit test client`.

![integration-test-stack.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1625772708649/YrjgQLAEL.jpeg)

## Creating the test stack

Now let's look at some code. To take advantage of the base functionality, our new test stack needs to extend `IntegrationTestStack`. For the moment, we will concentrate on how to use this class, but if you are interested in the inner workings of `IntegrationTestStack`, then you can find the code for it and everything else in the [GitHub repo](TODO).

```TypeScript
export default class FileEventPublisherTestStack extends IntegrationTestStack {
  static readonly ResourceTagKey = 'FileEventPublisherTestStackResource';

  static readonly TestBucketId = 'TestBucket';

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id, {
      testResourceTagKey: FileEventPublisherTestStack.ResourceTagKey,
      deployIntegrationTestTable: true,
      deployTestObserverFunction: true,
    });
```

Here we declare a couple of constants that we will need later for the `Unit test client` to work its magic, then we turn our attention to the main event in the constructor.

Here we supply three properties to `super`:

- `testResourceTagKey`: This is used as the key to tag any resources that our tests need to interact with.
- `deployIntegrationTestTable`: This `boolean` property specifies whether or not we want a table to be created to hold the observable outputs of the tests.
- `deployTestObserverFunction`: This `boolean` property specifies whether or not we want a function to be created that writes all events received to the output table.

Next we need a bucket to upload to.

```TypeScript
const testBucket = new s3.Bucket(this, FileEventPublisherTestStack.TestBucketId, {
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
});

this.addTestResourceTag(testBucket, FileEventPublisherTestStack.TestBucketId);
```

Here we specify a test bucket that will be cleaned up automatically (the CDK construct creates a function to do this). We also have a call to `addTestResourceTag`, which tags it for later discovery and interaction.

Onto the system under test.

```TypeScript
const sut = new FileEventPublisher(this, 'SUT', {
  fileBucket: testBucket,
  deploymentTarget: 'TEST',
});
```

Here we specify an instance of our construct `FileEventPublisher`. We wire the `fileBucket` property up to our test bucket. We also set the `deploymentTarget` to `TEST`, which changes the removal policy for the underlying resources to one more suitable for a test environment. What we want to avoid is test resources hanging around causing confusion and costing money.

Finally, we add something to observe the results of our tests.

```TypeScript
sut.fileEventTopic.addSubscription(
  new subscriptions.LambdaSubscription(this.testObserverFunction)
);
```

Earlier, we specified `true` for the `deployTestObserverFunction` property. This will cause the `IntegrationTestStack` to create a simple function that writes all events received to the test output table. In this case, we want to observe SNS events, so we wire it up to the topic of the system under test.

Now we have our test stack ready to go. We can use `cdk synth` to verify it, and then use `cdk deploy` to deploy it. Once done, it's time to turn our focus to the unit tests.

## Creating the unit test

For the unit test we will be using the [Mocha](TODO) testing framework and the [Chai](TODO) assertion library. The approach doesn't use anything specific to these, so it should be still viable if other frameworks and libraries are used.

The first thing we need to do is create and initialise an instance of `UnitTestClient`.

```TypeScript
describe('FileEventPublisher Tests', () => {
  const testClient = new UnitTestClient({
    testResourceTagKey: FileEventPublisherTestStack.ResourceTagKey,
  });

  before(async () => {
    await testClient.initialiseClientAsync();
  });

  it('New file upload', async () => {
    // Our test goes here
  });
});
```

The constructor requires a value for `testResourceTagKey`. This is literally the key for the `UnitTestClient` to locate resources by their tag. When `initialiseClientAsync` is called, `UnitTestClient` uses the `getResources` method from the `ResourceGroupsTaggingAPI` SDK to locate all resources that have a tag with a key of `FileEventPublisherTestStack.ResourceTagKey`. This method returns an array of resource ARNs and their tags, for example.

```json
[
  {
    "ResourceARN": "arn:aws:dynamodb:eu-west-2:728023361653:table/FileEventPublisherTestStack-IntegrationTestTableD3B8E277-OSEUU2XIBRK",
    "Tags": [
      {
        "Key": "FileEventPublisherTestStackResource",
        "Value": "IntegrationTestTable"
      }
    ]
  },
  ...
]
```

One thing to note is that all the SDK calls require the AWS region. The way the code is currently set up, this value is specified via a `.env` file containing a entry of the following format.

```
AWS_REGION=eu-west-2
```

Before we can start on the usual parts of a unit test, we first need to make a call to `initialiseTestAsync` passing in a test identifier. Behind the scenes, `initialiseTestAsync` uses the identifier to clear down all data recorded against it in the `Integration test` table.

```TypeScript
await testClient.initialiseTestAsync('New file upload');
```

The `Arrange` step is next. In this case, we create the object to be uploaded and the S3 key to upload it to.

```TypeScript
const configurationFile = newConfigurationFile();
const configurationFileS3Key = configurationFile.header.name;
```

The `Act` step is more interesting.

```TypeScript
await testClient.uploadObjectToBucketAsync(
  FileEventPublisherTestStack.TestBucketId,
  configurationFileS3Key,
  configurationFile
);
```

Here we use the `uploadObjectToBucketAsync` method on the `UnitTestClient` instance to upload our test object. We pass in the statically-known value `FileEventPublisherTestStack.TestBucketId` that was used to tag the resource. Underneath, the `UnitTestClient` uses this to resolve it to the deployed bucket name before making the SDK call to do the upload. This keeps our unit test clean and decouples it from the details of a specific deployment.

Next, we move to the additional step in an event-driven serverless test, the `Await` step.

TODO

-----------------------------------------------

```TypeScript

// Arrange


// Act


// Await

const { outputs, timedOut } = await testClient.pollOutputsAsync<SNSEvent>({
  until: async (o) => getFileEventCount(o) === 2,
  intervalSeconds: 2,
  timeoutSeconds: 12,
});

// Assert

const fileEvents = getFileEvents(outputs);

expect(timedOut).to.equal(false);

expect(fileEvents.length).to.equal(2);

expect(
  fileEvents.some(
    (e) =>
      e.s3Key === configurationFileS3Key &&
      e.eventType === FileEventType.Created &&
      e.sectionType === FileSectionType.Header
  )
);

expect(
  fileEvents.some(
    (e) =>
      e.s3Key === configurationFileS3Key &&
      e.eventType === FileEventType.Created &&
      e.sectionType === FileSectionType.Body
  )
);

```