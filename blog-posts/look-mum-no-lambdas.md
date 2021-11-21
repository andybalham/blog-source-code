# 👀 Look mum no Lambdas!

## Building low-code functionality with the CDK and Step Functions

There was a recent announcement that [AWS added support for over 200 AWS Services to Step Functions](https://aws.amazon.com/about-aws/whats-new/2021/09/aws-step-functions-200-aws-sdk-integration/). Here we look at how this impressive feat was achieved and we go through a worked example of how we can take advantage of it when using the [AWS CDK](https://aws.amazon.com/cdk/).

All code in this post can be found on my [GitHub repo](https://github.com/andybalham/blog-source-code/tree/master/cdk-step-functions-and-sdk-integration).

## TL;DR

- Use the `CallAwsService` task to call any [AWS service](https://docs.aws.amazon.com/step-functions/latest/dg/supported-services-awssdk.html) via the SDK
- The properties of `CallAwsService` are not strongly-typed, so you need to do your research

## How did they do that?

Before the announcement, Step Functions already had support for a number of AWS services. These included SNS, SQS, and DynamoDB, and enabled these services to be invoked directly from a Step Function without the need for any 'Lambda glue'. However, there were many services missing, e.g. S3, and the operations you could perform on the services were limited, e.g. just publishing to SNS.

For example, in CDK we could define tasks of type `DynamoPutItem` as follows:

```TypeScript
const putObjectIndex = new sfnTasks.DynamoPutItem(sfnScope, 'PutObjectIndex', {
  table: props.indexTable,
  item: { // snip
```

The Step Functions team must have been faced with the prospect of creating more and more of these specific types of task. This would have been onerous and would also add an ongoing burden to the team. Given this, their solution was to create a new type of task, `CallAwsService`, that allows Step Functions to call any AWS service via the AWS SDK. As the [announcement says](https://aws.amazon.com/about-aws/whats-new/2021/09/aws-step-functions-200-aws-sdk-integration/):

> Now, with the AWS SDK integration, it’s even simpler to build on AWS. SaaS developers can take data stored in Amazon S3, augment it with information stored in Amazon DynamoDB, then process with AWS machine learning services such as Amazon Textract or Amazon Comprehend to add new capabilities for their users.

For example, we can now invoke the S3 `listObjectsV2` method to get the objects in a particular bucket as follows:

```TypeScript
const listObjects = new sfnTasks.CallAwsService(sfnScope, 'ListObjects', {
  service: 's3',
  action: 'listObjectsV2',
  parameters: {
    Bucket: props.sourceBucket.bucketName,
  }, // snip
```

The upside of this approach is that we can now avoid 'Lambda glue' for these 200-plus services, but one downside is that in CDK we don't get strongly-typed task types. Maybe that is up to the community to provide, so over to you 😉

## Let's start building!

As mentioned earlier, S3 was one of the services that previously could not be called directly from Step Functions. Given that, and the simplicity of the service, it seems a good candidate for us to try out the new functionality. With this in mind, we intend to create a CDK construct that satisfies the following requirement.

- **GIVEN** an S3 bucket and a DynamoDB table
- **WHEN** the Step Function is invoked
- **THEN** for each object in the bucket:
  - An item is added to the table containing metadata of the object

With this requirement in mind, let's start creating our construct. We will start with a basic version that has the inputs we require and a simple state machine that lists the objects in the source bucket.

```TypeScript
export interface BucketIndexerProps {
  sourceBucket: s3.Bucket;
  indexTable: dynamodb.Table;
}

export default class BucketIndexer extends cdk.Construct {
  readonly stateMachine: sfn.StateMachine;

  constructor(scope: cdk.Construct, id: string, props: BucketIndexerProps) {
    super(scope, id);

    const listObjects = new sfnTasks.CallAwsService(this, 'ListObjects', {
      service: 's3',
      action: 'listObjectsV2',
      parameters: {
        Bucket: props.sourceBucket.bucketName,
      },
      iamResources: [props.sourceBucket.arnForObjects('*')],
    });

    this.stateMachine = new sfn.StateMachine(this, 'BucketIndexerStateMachine', {
      definition: sfn.Chain.start(listObjects),
    });

    props.sourceBucket.grantRead(this.stateMachine);
    props.indexTable.grantWriteData(this.stateMachine);
  }
}
```

> In order to run this, we need to deploy our construct. To do this we create an [integration test stack](https://github.com/andybalham/blog-source-code/blob/master/cdk-step-functions-and-sdk-integration/lib/BucketIndexerTestStack.ts). This approach to serverless testing is covered in my series [Serverless integration testing with the AWS CDK](https://www.10printiamcool.com/series/integration-test-with-cdk).

Let's have a look at the properties for `CallAwsService`:

- `service`: The AWS service to call ([full list](https://docs.aws.amazon.com/step-functions/latest/dg/supported-services-awssdk.html)).
- `action`: The API action to call (use `camelCase`).
- `parameters`: Parameters for the API action call (use `PascalCase` for the parameter names).
- `iamResources`: The resources for the IAM statement that will be added to the state machine role's policy to allow the state machine to make the API call (by default the action for this IAM statement will be `service:action`).

As mentioned earlier, there is no strong-typing for `parameters`, so you will not get prompted automatically for any and you will probably need a bit of trial an error to get them right.

It wasn't clear initially what to supply for `iamResources`. After finding an example for S3 on GitHub, which I can sadly not find and credit, it looks like this is the ARN for the resource or resources being accessed. In our case, the S3 objects in the bucket.

To test, we put an object in the bucket and run the state machine. The following output confirms that the call is being made successfully.

```json
{
  "Contents": [
    {
      "ETag": "\"99914b932bd37a50b983c5e7c90ae93b\"",
      "Key": "MyKey",
      "LastModified": "2021-11-21T10:02:14Z",
      "Size": 2,
      "StorageClass": "STANDARD"
    }
  ],
  "IsTruncated": false,
  "KeyCount": 1,
  "MaxKeys": 1000,
  "Name": "bucketindexerteststack-testsourcebucketc9809ad6-xtvk751nyhls6",
  "Prefix": ""
}
```

## Iterating the results

The next step if for us to process the results and extract extra information for each object.

To do this we define a `Map` state to iterate over the `Content` array. Here we can take advantage of the `maxConcurrency` property and do this in parallel.

```TypeScript
const forEachObject = new sfn.Map(this, 'ForEachObject', {
  itemsPath: '$.Contents',
  parameters: {
    'Content.$': '$$.Map.Item.Value',
    'BucketName.$': '$.Name',
  },
  maxConcurrency: 6,
});
```

To extract information about the individual S3 objects, we need another `CallAwsService` task state. This task invokes the `headObject` SDK method and stores the results alongside the existing data.

```TypeScript
const headObject = new sfnTasks.CallAwsService(this, 'HeadObject', {
  service: 's3',
  action: 'headObject',
  parameters: {
    'Bucket.$': '$.BucketName',
    'Key.$': '$.Content.Key',
  },
  iamResources: [props.sourceBucket.arnForObjects('*')],
  resultPath: '$.Head',
});
```

We then update the definition to include this new functionality.

```TypeScript
this.stateMachine = new sfn.StateMachine(this, 'BucketIndexerStateMachine', {
  definition: sfn.Chain.start(listObjects).next(
    forEachObject.iterator(sfn.Chain.start(headObject))
  ),
});

```

Deploying the stack and running the state machine again, we see the following output for each object:

```json
{
  "BucketName": "bucketindexerteststack-testsourcebucketc9809ad6-xtvk751nyhls6",
  "Content": {
    "ETag": "\"99914b932bd37a50b983c5e7c90ae93b\"",
    "Key": "MyKey",
    "LastModified": "2021-11-21T10:02:14Z",
    "Size": 2,
    "StorageClass": "STANDARD"
  },
  "Head": {
    "AcceptRanges": "bytes",
    "ContentLength": 2,
    "ContentType": "application/octet-stream",
    "ETag": "\"99914b932bd37a50b983c5e7c90ae93b\"",
    "LastModified": "2021-11-21T10:02:14Z",
    "Metadata": {}
  }
}
```

## Indexing the objects

The final piece in our puzzle is to create an index of the objects in the DynamoDB table. This we will do using the `DynamoPutItem` task. This gives us a chance to see the difference to using the `CallAwsService`. The `DynamoPutItem` task has strongly-typed properties and helper classes (e.g. `DynamoAttributeValue`). This means that we are prompted to specify values of the correct types for the `table` and `item` properties and we are assisted in populating them.

```TypeScript
const dynamoAttributeStringAt = (jsonPath: string): sfnTasks.DynamoAttributeValue =>
  sfnTasks.DynamoAttributeValue.fromString(JsonPath.stringAt(jsonPath));

const putObjectIndex = new sfnTasks.DynamoPutItem(this, 'PutObjectIndex', {
  table: props.indexTable,
  item: {
    bucketName: dynamoAttributeStringAt('$.BucketName'),
    key: dynamoAttributeStringAt('$.Content.Key'),
    metadata: sfnTasks.DynamoAttributeValue.fromMap({
      lastModified: dynamoAttributeStringAt('$.Content.LastModified'),
      contentType: dynamoAttributeStringAt('$.Head.ContentType'),
    }),
  },
});
```

With this state defined, we add it to the iterator in the state machine definition.

```TypeScript
this.stateMachine = new sfn.StateMachine(this, 'BucketIndexerStateMachine', {
  definition: sfn.Chain.start(listObjects).next(
    forEachObject.iterator(sfn.Chain.start(headObject).next(putObjectIndex))
  ),
});
```

Now when we run our test, we can use the AWS console to see that out step function is now putting items into the DynamoDB table as expected. No Lambdas involved! 🎆

## Summary

In this post, we built a step function that - before the SDK integration - would have required us to create, test, and maintain two Lambda functions. Having no code is good, as it always comes with a cost. In building our construct, we saw how to define SDK calls in a step function using the CDK, and how these are loosely-typed.

So now you have 200+ toys to play with, so what are you waiting for?

> The accompanying [GitHub repo](https://github.com/andybalham/blog-source-code/tree/master/cdk-step-functions-and-sdk-integration) contains all the code in this post as part of a working project, and also includes a more sophisticated version which takes into account continuation tokens.