In the [first part](https://www.10printiamcool.com/serverless-integration-testing-with-cdk-part-1) of this series, I looked at how we could use [CDK](https://aws.amazon.com/cdk/) to compose our serverless applications from [constructs](https://docs.aws.amazon.com/cdk/latest/guide/constructs.html) that can be tested in isolation. In this part, I look at how we can automate the testing of these constructs to get repeatable results and the confidence that comes with them.

## The application

The application we are working on is event-driven, where files added to an S3 bucket cause a ripple of events. The applicant does a simplified affordability calculation for loan application scenarios. For example, when a scenario is added or updated, we want the affordability for that scenario to automatically be recalculated and the results stored. The architecture is shown below.

![affordability-full.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1622902599565/z0Ozk5FJQ.jpeg)

In the first part of the series, we went through how we can compose the application from three CDK constructs. These CDK constructs can be deployed and tested in isolation and are shown by the shaded boxes below.

![affordability-grouped.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1623089346147/se6bw9clw1.jpeg)

For this post, we are going to concentrate on the `Event publisher` construct. We had got to a point where we could deploy a test stack containing the `Event publisher` construct, along with a test bucket and a test subscriber that logged all received events to CloudWatch. By using the [AWS Toolkit](https://aws.amazon.com/visualstudiocode/), we were able to upload test files and view the resulting events.

![test-aws-toolkit.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1624378780047/eYL4TXxGy.jpeg)

## Utilising the AWS CLI

This is a pretty good start, as we can verify that we have wired up all the AWS resources in such a way that we get the the effect we want. This wouldn't be possible just from local testing. What isn't so good is the fact that our testing is ad-hoc and not repeatable.

With this in mind, my first thought is how can we write a unit test that can upload files to S3. In fact, how can we upload files to S3. One way is through the use of the [AWS CLI](https://aws.amazon.com/cli/) and the [s3 cp command](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/s3/cp.html), e.g.:

```
aws s3 cp test.txt s3://mybucket/test2.txt
```

> Note, I am aware that there might be better ways that using the AWS CLI for this (e.g. using the SDK), but for the purposes of this post this approach is sufficient (and works 😊).

Two further questions spring to mind:

1. How do we know the name of the bucket?
1. How do run a command line tool from [Node.js](https://nodejs.org/en/)?

The first question is easy to answer, as we can add an output to our test stack [`FileEventPublisherTestStack`](https://github.com/andybalham/blog-source-code/blob/master/integration-testing-with-cdk/src/cdk/stacks/test/FileEventPublisherTestStack.ts) as follows:

```TypeScript
new cdk.CfnOutput(this, `TestBucketName`, {
  value: testBucket.bucketName,
});
```

Now when we deploy the stack we see the following:

```
Outputs:
FileEventPublisherTestStack.TestBucketName = fileeventpublisherteststack-testbucketb80bc560-hghxtm1zahbc
```

The second question took a bit of googling, but the end result was the following function:

```TypeScript
import * as child from 'child_process';

async function execCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    child.exec(command, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}
```

Armed with these I can now start writing a unit test to verify that uploading a new `File` results in two events, one for `header` and one for the `body`. We will give each file a unique name, so that we can correlate the events generated with our input actions.

## Arranging

The first step is to create a unique file and save it locally for uploading.

```TypeScript
// Arrange

const configurationFile: File<Configuration> = {
  header: {
    fileType: FileType.Configuration,
    name: `Configuration_${nanoid(10)}`,
  },
  body: {
    incomeMultiplier: 0,
  },
};

const configurationFileName = `${configurationFile.header.name}.json`;
fs.writeFileSync(configurationFileName, JSON.stringify(configurationFile));
```

> Note, I am using the excellent [`nanoid`](https://www.npmjs.com/package/nanoid) package to generate some short unique ids.

## Acting

The next step is to upload the file to S3. This where we can use the output from deploying the test stack.

```TypeScript
// Act

try {
  const testBucketName = 'fileeventpublisherteststack-testbucketb80bc560-hghxtm1zahbc';
  const uploadTestFileCommand = `aws s3 cp ${configurationFileName} s3://${testBucketName}`;
  console.log(await execCommand(uploadTestFileCommand));
} finally {
  fs.unlinkSync(configurationFileName);
}
```

Now we run the unit test, we see the following that confirms that we are successfully uploading the file.

```
Completed 103 Bytes/103 Bytes (382 Bytes/s) with 1 file(s) remaining
upload: .\Configuration_x5RvXtJGFl.json to s3://fileeventpublisherteststack-testbucketb80bc560-hghxtm1zahbc/Configuration_x5RvXtJGFl.json
```

## Asserting

We now have the Arrange and Act parts of the [Arrange/Act/Assert](https://docs.telerik.com/devtools/justmock/basic-usage/arrange-act-assert) testing pattern in place. The next question is how to assert. We could try to read the CloudWatch logs, but that feels clunky and imprecise. If the output of system under test wrote to a persistent store of some kind then we could query that, but in this case it raises SNS events that are not stored anywhere.

The answer is to extend the test scaffolding so that the test subscriber stores the received messages in an easily queryable form. Thankfully, in DynamoDB, AWS has the perfect tool for this job. The result will look like the following.

![test-aws-cli.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1624556357457/0yaAQLIDr.jpeg)

The `TestOutputsTable` is keyed by the `s3Key` and SNS `messageId`, which will enable us to get back all outputs that are related to a particular test file. By including the `FileEvent` as part of the item, we will be able to assert that our tests have the expected effects.

```TypeScript
const testOutputsTable = new dynamodb.Table(this, 'TestOutputsTable', {
  partitionKey: { name: 's3Key', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'messageId', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
});

const fileEventTestSubscriberFunction = newNodejsFunction(
  this,
  'FileEventTestSubscriberFunction',
  'fileEventTestSubscriber',
  {
    TEST_RESULTS_TABLE_NAME: testOutputsTable.tableName,
  }
);

sut.fileEventTopic.addSubscription(
  new subscriptions.LambdaSubscription(fileEventTestSubscriberFunction)
);

testOutputsTable.grantWriteData(fileEventTestSubscriberFunction);

new cdk.CfnOutput(this, `TestOutputsTableName`, {
  value: testOutputsTable.tableName,
});
```

Again, we have an output and so on deployment we see the following:

```
Outputs:
...
FileEventPublisherTestStack.TestOutputsTableName = FileEventPublisherTestStack-TestOutputsTable8A620419-21HCDG1KTVQKN
```

Now we have a way of querying the results of our test, we can build the appropriate AWS CLI command and run it to get the results of our test. We can then parse the results into an array of the `FileEvent` instances raised and assert our expectations.

```TypeScript
// Assert

const testOutputsTableName = 'FileEventPublisherTestStack-TestOutputsTable8A620419-21HCDG1KTVQKN';

const queryTestOutputsCommand = `aws dynamodb query \
  --table-name ${testOutputsTableName} \
  --key-condition-expression "s3Key = :s3Key" \
  --expression-attribute-values "{ \\":s3Key\\": { \\"S\\": \\"${configurationFileName}\\" } }"`;

const queryResult = JSON.parse(await execCommand(queryTestOutputsCommand)) as QueryOutput;

const fileEvents = queryResult.Items?.map(
  (item) => AWS.DynamoDB.Converter.unmarshall(item).message as FileEvent
);

expect(fileEvents?.length).to.equal(2);
```

What could possibly go wrong?

```
AssertionError: expected 0 to equal 2
+ expected - actual

-0
+2
```

What have we missed? ¯\\_(ツ)_/¯

## Patience

![patience.png](https://cdn.hashnode.com/res/hashnode/image/upload/v1624557579753/KwegZzNPh.png)

Well, we have missed a key aspect of our application. That aspect is that it is asynchronous and that it takes a finite amount of time for the S3 event to be raised, processed, the DynamoDB event to be raised, processed, and finally the output written to the outputs table to be read. We need to be patient.

```TypeScript
// Wait

await new Promise((resolve) => setTimeout(resolve, 6 * 1000));

// Assert
```

Whilst this is a bit of a sledgehammer to crack a nut, when we run our test we see the following:

```
1 passing (5s)
```

Success! 🍾

## Summary

We now have a semi-repeatable way to test at least one aspect of one part of our application. I say 'semi-repeatable', as there is no guarantee that the time we gave the test will always be sufficient. We have a good start, but clearly there ways to improve. That will be the topic of the next post.

All the code above is available on GitHub [here](https://github.com/andybalham/blog-source-code/tree/master/integration-testing-with-cdk).

---

> I am aware that others are doing work in this space, so please check out the following if you are interested:
> * Theodo's promising [`sls-test-tools`](https://github.com/Theodo-UK/sls-test-tools) that provide "a range of utilities, setup, teardown and assertions to make it easier to write effective and high quality integration tests for Serverless Architectures on AWS."
> * The [AWS Testing Library](https://github.com/erezrokah/aws-testing-library) which allows you to assert the presence of items within AWS resources
> * [How to test your EventBridge integrations](https://serverlessfirst.com/eventbridge-testing-guide/), an article describing an approach to serverless testing.
