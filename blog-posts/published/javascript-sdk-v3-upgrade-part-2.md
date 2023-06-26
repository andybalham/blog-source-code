# Part 2

In this series, we continue looking at upgrading a TypeScript codebase from AWS SDK V2 to AWS SDK V3. Here we concentrate on DynamoDB and also look at S3, Step Functions, and Lambda functions.

## DynamoDB clients

As we saw in the [first part of this series](https://www.10printiamcool.com/updating-to-nodejs-18-and-aws-javascript-sdk-v3-part-1), converting from V2 to V3 can be as straightforward as changing the type of service client, then using that client to send a command rather than invoking a method.

So the following:

```TypeScript
readonly sns: AWS.SNS;
...
const publishInput: PublishInput = {
  Message: JSON.stringify(message),
  TopicArn: this.topicArn,
  MessageAttributes: messageAttributes,
};

await this.sns.publish(publishInput).promise();
```

Becomes:

```TypeScript
readonly sns: SNSClient;
...
const publishInput: PublishInput = {
  Message: JSON.stringify(message),
  TopicArn: this.topicArn,
  MessageAttributes: messageAttributes,
};

await this.sns.send(new PublishCommand(publishInput));
```

The same applies for DynamoDB, there is a `DynamoDBClient` class in the `@aws-sdk/client-dynamodb` package. As expected, this can be used to send commands to put and get items. However, unlike the `AWS.DynamoDB.DocumentClient` class in the V2 SDK, the `DynamoDBClient` class only deals with objects in the low-level [DynamoDB format](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Programming.LowLevelAPI.html). As you can see from the example below, this is a JSON format that uses typed objects for properties:

```json
{
  "Item": {
    "Age": { "N": "8" },
    "Name": { "S": "Rover" },
    "Breed": { "S": "Beagle" },
    "AnimalType": { "S": "Dog" }
  }
}
```

I decided to do the modern thing and ask ChatGPT if there was a way to convert the output of `DynamoDBClient`. To its credit it did point me in one of the possible directions.

> If you are using the `query` method of the `DynamoDBClient` object to query a DynamoDB table in JavaScript, you will need to unmarshall the output to convert the raw DynamoDB item format into a more usable JavaScript format.
> The output of the `query` method is returned in the native DynamoDB item format, which is a complex JSON structure that includes data types and other metadata. To work with the data in a more convenient way, you will need to unmarshall the output using the `unmarshall` function provided by the `@aws-sdk/util-dynamodb` module.
> Here's an example code snippet that includes unmarshalling of the query results:

```javascript
// Import the required modules from the AWS SDK for JavaScript V3
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

// Set the AWS region and create a new DynamoDB client object
const REGION = "us-east-1";
const dynamodbClient = new DynamoDBClient({ region: REGION });

// Set the parameters for the query
const params = {
  TableName: "my-table",
  KeyConditionExpression: "partitionKey = :pk",
  ExpressionAttributeValues: {
    ":pk": { S: "my-partition-key" },
  },
};

// Create a new QueryCommand object and execute the query
const command = new QueryCommand(params);
const response = await dynamodbClient.send(command);

// Unmarshall the results
const items = response.Items.map((item) => unmarshall(item));

// Output the results to the console
console.log(items);
```

Although this is correct, and the `unmarshall` function will come in useful later, this isn't the route I ended up taking. The V3 SDK uses a middleware-based approach and the `DynamoDBClient` can be wrapped with middleware to do the marshalling as part of the pipeline.

This approach is explained in [Using the DynamoDB Document Client](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/dynamodb-example-dynamodb-utilities.html). This shows how the [`@aws-sdk/lib-dynamodb` package](https://www.npmjs.com/package/@aws-sdk/lib-dynamodb) can be used as follows.

```TypeScript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
...
// Wrap a DynamoDBClient instance
const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
...
const queryOutput = await this.documentClient.send(
  new QueryCommand(queryParams)
);

// Return unmarshalled objects
return queryOutput.Items;
```

One thing to be aware of is that `DynamoDBDocumentClient` does not support all the same commands as `DynamoDBClient`. So you might need to have an instance of the latter available as well as the wrapped version.

In part of the codebase, a DynamoDB stream event is used to retrieve the corresponding item from the table. One thing I found was that the stream `AttributeValue` appears to no longer be compatible with DynamoDB version. To get round this, I had to add an explicit cast. It was here that the `unmarshall` function came in useful, as the key is returned in the low-level JSON format.

```TypeScript
import { AttributeValue, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { AttributeValue as StreamAttributeValue } from 'aws-lambda/trigger/dynamodb-stream';

async getItemByEventKeyAsync<T>(
    eventKey: { [key: string]: StreamAttributeValue } | undefined
  ): Promise<T | undefined> {
    //
    if (eventKey === undefined) {
      return undefined;
    }

    // Cast to prevent: 'AWSLambda.AttributeValue' is not assignable to type 'DynamoDB.AttributeValue'
    const key = unmarshall(eventKey as Record<string, AttributeValue>);

    return getItem(this.region, this.tableName, key) as unknown as T;
  }
```

## S3

One of the examples in the codebase being converted used [pre-signed URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) to pass data. It turns out that pre-signing has changed with the V3 SDK. There is now a separate package (`s3-request-presigner`) that you need to reference to produce a URL for a V3 command.

```TypeScript
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
...
const s3Params = {
  Bucket: bucketName,
  Key: key,
};
...
const signedCommand = new GetObjectCommand(s3Params);
const signedUrl = await getSignedUrl(s3, signedCommand, {
  expiresIn: expirySeconds ?? 60,
});
```

## Lists now can return `undefined`

Another thing that I noticed as part of the conversion process was that lists returned by the APIs can now be `undefined`. Below is an example where step function executions are being listed.

```TypeScript
const { executions } = await stepFunctions.listExecutions(opts).promise();
if (executions.length > 0) {
  const newestRunning = executions[0];
```

When converting, I had to add an extra test to cater for the possibility of `undefined`.

```TypeScript
const { executions } = await sfnClient.send(new ListExecutionsCommand(opts)); // Can be undefined
if (executions && executions.length > 0) {
  const newestRunning = executions[0];
```

## Invoking Lambda functions

Another small quirk that emerged from my conversion was that I needed to encode/decode the payloads when invoking a Lambda function. The `Payload` is now returned as a `Uint8Array`, so we need to use a `TextEncoder` to convert from and to JSON objects.

Here we encode the stringify-ed JSON object:

```TypeScript
const encoder = new TextEncoder();
const lambdaPayload = request ? { Payload: encoder.encode(JSON.stringify(request)) } : {};
```

And here we decode it before parsing:

```TypeScript
const decoder = new TextDecoder();
return JSON.parse(decoder.decode(Payload));
```

## Discoverability thoughts

As part of the conversion process, I encountered the following code that I had in place to reuse connections in Node.js.

```TypeScript
const documentClient = new DocumentClient({
  httpOptions: {
    agent,
  },
});
```

My thought was to navigate to the definition of the new options and look for something similar. However, I quickly found myself lost.

```TypeScript
constructor(configuration: DynamoDBClientConfig);
```

Led to...

```TypeScript
export interface DynamoDBClientConfig extends DynamoDBClientConfigType {
}
```

Which led to...

```TypeScript
type DynamoDBClientConfigType = Partial<__SmithyConfiguration<__HttpHandlerOptions>> & ClientDefaults & RegionInputConfig & EndpointInputConfig<EndpointParameters> & RetryInputConfig & HostHeaderInputConfig & AwsAuthInputConfig & UserAgentInputConfig & EndpointDiscoveryInputConfig & ClientInputEndpointParameters;
```

At which point I stopped and searched for 'aws sdk V3 keep-alive' and found [Reusing connections with keep-alive in Node.js](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-reusing-connections.html)

This allowed me to rewrite the original as follows:

```TypeScript
const documentClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    requestHandler: new NodeHttpHandler({
      httpAgent: agent,
    }),
  })
);
```

I appreciate there is a good reason for how the options are now defined, but I do feel it has affected discoverability via the definition. I just need to remember to fall back on search and AI chatbots.

> As it turns out, this 'keep alive' code is not needed any more. See [HTTP keep-alive is on by default in modular AWS SDK for JavaScript](https://aws.amazon.com/blogs/developer/http-keep-alive-is-on-by-default-in-modular-aws-sdk-for-javascript/)

## The middleware-based approach

As touched on in the DynamoDB section, the V3 SDK uses a middleware-based approach. We saw it when we wrapped a `DynamoDBClient` instance in a `DynamoDBDocumentClient` instance.

```TypeScript
const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
```

The article [What's the AWS SDK for JavaScript?](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html) explains how you can create your own customisations.

> In V3, you can use a new middleware stack to control the lifecycle of an operation call. Each middleware stage in the stack calls the next middleware stage after making any changes to the request object.

It goes on to give the following example of adding a custom header to a Amazon DynamoDB client.

```TypeScript
dbClient.middlewareStack.add(
  (next, context) => args => {
    args.request.headers["Custom-Header"] = "value";
    return next(args);
  },
  {
    step: "build"
  }
);

dbClient.send(new PutObjectCommand(params));
```

This approach, coupled with the ability to have a smaller bundle size, helped me understand the change in approach in the V3 SDK. On the surface, the changes looked a bit like unnecessary complication.

## Summary

In this post, we looked at the challenges that I had when converting code for DynamoDB, Step Functions, S3, and Lambda functions and how I solved them. Hopefully, my experience can help others. In the main, the process was quite painless. However, my codebase was small and I had integration tests to verify the changes in the cloud.

If you have many unit tests that mock the older SDK, then your challenges may be greater than mine. Personally, I would try to avoid mocking at that level in the first place, but that might be a subject for another post.

It is well worth knowing that there is much improved documentation in [Developer Preview](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/preview/). This documentation is searchable and goes beyond the original auto-generated version and includes code samples.

For those that like to look at code, here are the links to the resulting pull requests from my upgrading:

- [Cloud test kit PR](https://github.com/andybalham/cdk-cloud-test-kit/pull/17/files#diff-7dffb5ee14c2cb1f7def89e1049402f101dd809ba41a6d02a840a5b66a2ec5fd)
- [Loan Broker example PR](https://github.com/andybalham/blog-enterprise-integration/pull/1/files#diff-0a8a7b936c26ea7c6aaf8da7a20ae1a1afedc69710972a49314a20339c4653c5)

## Links

- [AWS SDK for JavaScript V3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/index.html)
- [AWS SDK for JavaScript - Developer Preview](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/preview/)
- [Migrating your code to SDK for JavaScript V3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrating-to-v3.html)
- [aws-sdk-js-codemod](https://www.npmjs.com/package/aws-sdk-js-codemod)
- [Setting up the SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-up.html)
- [DynamoDB marshalling](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/modules/_aws_sdk_util_dynamodb.html)
- [Using the DynamoDB Document Client](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/dynamodb-example-dynamodb-utilities.html)
