In the [first part](TODO) of this series, I looked at how we could use [CDK](TODO) to compose our serverless applications from testable [constructs](TODO) that can be tested in isolation. In this part, I look at how we can automate the testing of these constructs to get repeatable results and the confidence that comes with them.

The application we are working on is event-driven, where files added to an S3 bucket cause a ripple of events. The applicant does a simplified affordability calculation for loan application scenarios. For example, when a scenario is added or updated, we want the affordability for that scenario to automatically be recalculated and the results stored. The architecture is shown below.

![affordability-full.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1622902599565/z0Ozk5FJQ.jpeg)

In the first part of the series, we went through how we can compose the application from three CDK constructs. These CDK constructs can be deployed and tested in isolation and are shown by the shaded boxes below.

![affordability-grouped.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1623089346147/se6bw9clw1.jpeg)

For this post, we are going to concentrate on the `Event publisher` construct. We had got to a point where we could deploy a test stack containing the `Event publisher` construct, along with a test bucket and a test subscriber that logged all received events to CloudWatch. By using the [AWS Toolkit](TODO), we were able to upload test files and view the resulting events.

![test-aws-toolkit.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1624378780047/eYL4TXxGy.jpeg)

This is a pretty good start, as we can verify that we have wired up all the AWS resources in such a way that we get the the effect we want. This wouldn't be possible just from local testing. What isn't so good is the fact that our testing is ad-hoc and not repeatable.

With this in mind, my first thought is how can we write a unit test that can upload files to S3. In fact, how can we upload files to S3. One way is through the use of the [AWS CLI](TODO) and the [s3 cp command](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/s3/cp.html), e.g.:

```
aws s3 cp test.txt s3://mybucket/test2.txt
```

> Note, I am aware that there might be better ways that using the AWS CLI, but for the purposes of this post this approach is sufficient.

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

> Note, I am using the excellent [`nanoid`](TODO) package to generate some short unique ids.

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

We now have the Arrange and Act parts of the [Arrange/Act/Assert](https://docs.telerik.com/devtools/justmock/basic-usage/arrange-act-assert) testing pattern in place. The next question is how to assert. We could try to read the CloudWatch logs, but that feels clunky and imprecise. If the system under test wrote to a store of some kind then we could query that, but in this case it raises SNS events that are not stored anywhere.

The answer is to extend the test scaffolding so that the test subscriber stores the received messages in an easily queryable form. Thankfully, in DynamoDB, AWS has the perfect tool for this job. The result will look like the following.

![test-aws-cli.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1624384572024/khMeHE1wZ.jpeg)

The `TestResultsTable` is keyed by the `s3Key` and SNS `messageId`, which will enable us to get back all results for a particular file. The table will also contain the `FileEvent` raised. As we will need the name of the table, an output is added to the stack.

```TypeScript
const testResultsTable = new dynamodb.Table(this, 'TestResultsTable', {
  partitionKey: { name: 's3Key', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'messageId', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
});

const fileEventTestSubscriberFunction = newNodejsFunction(
  this,
  'FileEventTestSubscriberFunction',
  'fileEventTestSubscriber',
  {
    TEST_RESULTS_TABLE_NAME: testResultsTable.tableName,
  }
);

sut.fileEventTopic.addSubscription(
  new subscriptions.LambdaSubscription(fileEventTestSubscriberFunction)
);

testResultsTable.grantWriteData(fileEventTestSubscriberFunction);

new cdk.CfnOutput(this, `TestResultsTableName`, {
  value: testResultsTable.tableName,
});
```

Now on deployment we see the following:

```
Outputs:
...
FileEventPublisherTestStack.TestResultsTableName = FileEventPublisherTestStack-TestResultsTable8A620419-21HCDG1KTVQKN
```

Now we have a way of querying the results of our test, we can build the appropriate AWS CLI command and run it to get the results of our test. We can then parse the results into an array of the `FileEvent` instances raised and assert our expectations.

```TypeScript
// Assert

const testResultsTableName = 'FileEventPublisherTestStack-TestResultsTable8A620419-21HCDG1KTVQKN';

const queryTestResultsCommand = `aws dynamodb query \
  --table-name ${testResultsTableName} \
  --key-condition-expression "s3Key = :s3Key" \
  --expression-attribute-values "{ \\":s3Key\\": { \\"S\\": \\"${configurationFileName}\\" } }"`;

const queryResult = JSON.parse(await execCommand(queryTestResultsCommand)) as QueryOutput;

const fileEvents = queryResult.Items?.map(
  (item) => AWS.DynamoDB.Converter.unmarshall(item).message as FileEvent
);

expect(fileEvents?.length).to.equal(2);
```

What could possibly go wrong? Well, the following output indicates that something certainly could.

```
AssertionError: expected 0 to equal 2
+ expected - actual

-0
+2
```

What have we missed? Well, we have missed a key aspect of our application. TODO
