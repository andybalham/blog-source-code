# Part 2

In this series, we continue looking at upgrading a TypeScript codebase from AWS SDK v2 to AWS SDK v3. Here we concentrate on DynamoDB and also look at S3, Step Functions, and Lambda functions.

Links to pull requests:

- <https://github.com/andybalham/cdk-cloud-test-kit/pull/17/files#diff-7dffb5ee14c2cb1f7def89e1049402f101dd809ba41a6d02a840a5b66a2ec5fd>
- <https://github.com/andybalham/blog-enterprise-integration/pull/1/files#diff-0a8a7b936c26ea7c6aaf8da7a20ae1a1afedc69710972a49314a20339c4653c5>

## DynamoDB clients

As we saw in the [first part of this series](TODO), converting from v2 to v3 can be as straightforward as changing the type of service client, then using that client to send a command rather than invoking a method.

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

The same applies for DynamoDB, there is a `DynamoDBClient` class in the `@aws-sdk/client-dynamodb` package. As expected, this can be used to send commands to put and get items. However, unlike the `AWS.DynamoDB.DocumentClient` class in the v2 SDK, the `DynamoDBClient` class only deals with objects in the low-level [DynamoDB format](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Programming.LowLevelAPI.html). As you can see from the example below, this is a JSON format that uses typed objects for properties:

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

I decided to do the modern thing and ask ChatGPT if there was a way to convert the output of `DynamoDBClient`. To its credit it did point me in (one of) the right direction(s).

> If you are using the `query` method of the `DynamoDBClient` object to query a DynamoDB table in JavaScript, you will need to unmarshall the output to convert the raw DynamoDB item format into a more usable JavaScript format.
> The output of the `query` method is returned in the native DynamoDB item format, which is a complex JSON structure that includes data types and other metadata. To work with the data in a more convenient way, you will need to unmarshall the output using the `unmarshall` function provided by the `@aws-sdk/util-dynamodb` module.
> Here's an example code snippet that includes unmarshalling of the query results:

```javascript
// Import the required modules from the AWS SDK for JavaScript v3
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

Although this is correct, and the `unmarshall` function will come in useful later, this isn't the route I ended up taking. The v3 SDK uses a middleware-based approach and the `DynamoDBClient` can be wrapped with middleware to do the marshalling as part of the pipeline.

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

### S3

One of the examples in the codebase being converted used [pre-signed URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) to pass data. It turns out that pre-signing has changed with the v3 SDK. There is now a separate package (`s3-request-presigner`) that you need to reference to produce a URL for a v3 command.

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

### Lists now can return `undefined`

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

### Invoking Lambda functions

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

### Discoverability thoughts

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

At which point I stopped and searched for 'aws sdk v3 keep-alive' and found [Reusing connections with keep-alive in Node.js](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-reusing-connections.html)

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

> Note, as it turns out, this 'keep alive' code is not needed any more. See [HTTP keep-alive is on by default in modular AWS SDK for JavaScript](https://aws.amazon.com/blogs/developer/http-keep-alive-is-on-by-default-in-modular-aws-sdk-for-javascript/)

### Middleware-based approach

[What's the AWS SDK for JavaScript?](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html) mentions the middleware approach.

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

### Experience with `aws-sdk-js-codemod`

The following didn't work: `npx aws-sdk-js-codemod -t v2-to-v3 D:\Users\andyb\Documents\github\blog-enterprise-integration\@andybalham\aws-client-wrappers\DynamoDBTableClient.ts`

### Summary

- Mention [AWS SDK for JavaScript - Developer Preview](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/preview/)
- Reference [Migrating your code to SDK for JavaScript V3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrating-to-v3.html)

## -------------------------------------------------

[Reusing connections with keep-alive in Node.js](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-reusing-connections.html):

```TypeScript
const dynamodbClient = new DynamoDBClient({
    requestHandler: new NodeHttpHandler({
        httpAgent: new Agent({keepAlive: false})
    })
});
```

More difficult to find options via `F12`:

```TypeScript
export type DynamoDBClientConfigType = Partial<__SmithyConfiguration<__HttpHandlerOptions>> & ClientDefaults & RegionInputConfig & EndpointInputConfig<EndpointParameters> & RetryInputConfig & HostHeaderInputConfig & AwsAuthInputConfig & UserAgentInputConfig & EndpointDiscoveryInputConfig & ClientInputEndpointParameters;
```

## Thoughts

- Mention the advantage of abstractions and common libraries
- Does the change in SDK have a major impact on local testing?

Going forward:

- [DynamoDB marshalling](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/modules/_aws_sdk_util_dynamodb.html)
  - `const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");`
- [@aws-sdk/lib-dynamodb package](https://www.npmjs.com/package/@aws-sdk/lib-dynamodb)

## Notes

[AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/index.html)
[AWS SDK for JavaScript - Developer Preview](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/preview/)
[Migrating your code to SDK for JavaScript V3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrating-to-v3.html)
Try [aws-sdk-js-codemod](https://www.npmjs.com/package/aws-sdk-js-codemod)

The output is linked to the input via the type declaration:

```TypeScript
export declare class ListExecutionsCommand extends $Command<ListExecutionsCommandInput, ListExecutionsCommandOutput, SFNClientResolvedConfig> {
```

Q. Why does `$Command` start with a `$`?

You do need to go through a few hoops to get to the actual output.

The lists returned all can be `undefined`, which is a bit of a pain.

```TypeScript
const names = (events ?? []).map((event) => getEventName(event)).filter((name) => !!name);
```

Pre-signing URLs has changed a bit

Needed to encode/decode when invoking a Lambda function as it uses an `Uint8Array`:

```TypeScript
    const encoder = new TextEncoder();
    const lambdaPayload = request ? { Payload: encoder.encode(JSON.stringify(request)) } : {};

    if (Payload) {
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(Payload));
    }
```

From ChatGPT:

> Yes, if you are using the `query` method of the `DynamoDBClient` object to query a DynamoDB table in JavaScript, you will need to unmarshall the output to convert the raw DynamoDB item format into a more usable JavaScript format.
> The output of the `query` method is returned in the native DynamoDB item format, which is a complex JSON structure that includes data types and other metadata. To work with the data in a more convenient way, you will need to unmarshall the output using the `unmarshall` function provided by the `@aws-sdk/util-dynamodb` module.
> Here's an updated version of the example code snippet I provided earlier that includes unmarshalling of the query results:

```javascript
// Import the required modules from the AWS SDK for JavaScript v3
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

> In this updated example, we first import the `unmarshall` function from the `@aws-sdk/util-dynamodb` module.
> After executing the query, we use the `map` method of the `Items` array to apply the `unmarshall` function to each item in the array. This converts each item from the raw DynamoDB item format into a plain JavaScript object that is easier to work with.
> Finally, we output the unmarshalled results to the console for testing and debugging purposes.

However, there is [@aws-sdk/lib-dynamodb](https://www.npmjs.com/package/@aws-sdk/lib-dynamodb)

```TypeScript
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"; // ES6 import

// Bare-bones document client
const ddbDocClient = DynamoDBDocumentClient.from(client); // client is DynamoDB client
```

Not all commands on the doc client. Also commands don't have 'Item' in them too.

[What's the AWS SDK for JavaScript?](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html) mentions the middleware approach.

Stream attribute value is no longer type compatible:

```TypeScript
import { AttributeValue, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { AttributeValue as StreamAttributeValue } from 'aws-lambda/trigger/dynamodb-stream';

// Override: Type 'AWSLambda.AttributeValue' is not assignable to type 'DynamoDB.AttributeValue'
const key = unmarshall(eventKey as Record<string, AttributeValue>);
```

Build failed in GitHub action:

```text
 build: node_modules/@aws-sdk/lib-dynamodb/dist-types/commands/BatchExecuteStatementCommand.d.ts#L37
Property 'clientCommand' in type 'BatchExecuteStatementCommand' is not assignable to the same property in base type 'DynamoDBDocumentClientCommand<BatchExecuteStatementCommandInput, BatchExecuteStatementCommandOutput, BatchExecuteStatementCommandInput, BatchExecuteStatementCommandOutput, DynamoDBDocumentClientResolvedConfig>'.
```

---

Use of `NodejsFunction` that has the default of:

```TypeScript
export interface NodejsFunctionProps extends FunctionOptions {
    /**
     * The runtime environment. Only runtimes of the Node.js family are
     * supported.
     *
     * @default Runtime.NODEJS_14_X
     */
    readonly runtime?: lambda.Runtime;
}
```

<[Setting up the SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-up.html)>

Q. Should I remove the old SDK first, or should I install the new one alongside?

I could then visit each service in turn!

`import .*SNS.* from 'aws-sdk';`

`npm install @aws-sdk/client-SERVICE`

`import { SNSClient,  PublishCommand } from "@aws-sdk/client-sns";`

CodeWhisperer came up with the following:

```TypeScript
// Publish a message to the selected output topic using the javascript sdk v3
const command = new PublishCommand({
    TopicArn: outputTopicArn,
    Message: JSON.stringify(numbersEvent),
}
);

const result = await sns.send(command);

console.log(JSON.stringify({ result }, null, 2));
```

Warning in VS Code:

```text
C:\Program Files\nodejs\node.exe .\node_modules\mocha\bin\_mocha --require ts-node/register --timeout 999999 --colors D:\Users\andyb\Documents\github\cdk-cloud-test-kit\examples\simple-event-router\SimpleEventRouterTestStack.ts
(node:16616) NOTE: We are formalizing our plans to enter AWS SDK for JavaScript (v2) into maintenance mode in 2023.

Please migrate your code to use AWS SDK for JavaScript (v3).
For more information, check the migration guide at https://a.co/7PzMCcy
(Use `node --trace-warnings ...` to show where the warning was created)
```

Tests failed:

```text
  SimpleEventRouter Test Suite
spec.js:54
    1) Routes positive sums
spec.js:88
    2) Routes as expected: {"values":[],"isExpectedPositive":true}
spec.js:88
    3) Routes as expected: {"values":[1,2,3],"isExpectedPositive":true}
spec.js:88
    4) Routes as expected: {"values":[1,2,-3],"isExpectedPositive":true}
spec.js:88
    5) Routes as expected: {"values":[1,-2,-3],"isExpectedPositive":false}
spec.js:88
  0 passing (1m)
base.js:379
  5 failing
```

```text
2023-05-07T07:23:27.329Z  undefined ERROR Uncaught Exception
{
    "errorType": "Runtime.ImportModuleError",
    "errorMessage": "Error: Cannot find module '@aws-sdk/client-sns'\nRequire stack:\n- /var/task/index.js\n- /var/runtime/UserFunction.js\n- /var/runtime/Runtime.js\n- /var/runtime/index.js",
    "stack": [
        "Runtime.ImportModuleError: Error: Cannot find module '@aws-sdk/client-sns'",
        "Require stack:",
        "- /var/task/index.js",
        "- /var/runtime/UserFunction.js",
        "- /var/runtime/Runtime.js",
        "- /var/runtime/index.js",
        "    at _loadUserApp (/var/runtime/UserFunction.js:225:13)",
        "    at Object.module.exports.load (/var/runtime/UserFunction.js:300:17)",
        "    at Object.<anonymous> (/var/runtime/index.js:43:34)",
        "    at Module._compile (internal/modules/cjs/loader.js:1114:14)",
        "    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1143:10)",
        "    at Module.load (internal/modules/cjs/loader.js:979:32)",
        "    at Function.Module._load (internal/modules/cjs/loader.js:819:12)",
        "    at Function.executeUserEntryPoint [as runMain] (internal/modules/run_main.js:75:12)",
        "    at internal/main/run_main_module.js:17:47"
    ]
}
```

Hotswap not updating the runtime:

```text
Runtime
Node.js 14.x
```

Success!

```text
  SimpleEventRouter Test Suite
spec.js:54
    √ Routes positive sums (4175ms)
spec.js:83
    √ Routes as expected: {"values":[],"isExpectedPositive":true} (2135ms)
spec.js:83
    √ Routes as expected: {"values":[1,2,3],"isExpectedPositive":true} (2103ms)
spec.js:83
    √ Routes as expected: {"values":[1,2,-3],"isExpectedPositive":true} (2109ms)
spec.js:83
    √ Routes as expected: {"values":[1,-2,-3],"isExpectedPositive":false} (2141ms)
spec.js:83
  5 passing (13s)
```

Now to try [aws-sdk-js-codemod](https://www.npmjs.com/package/aws-sdk-js-codemod)

```text
npx aws-sdk-js-codemod -t v2-to-v3 .\examples\simple-message-router\simpleMessageRouter.ts
```

Insert images here

Need to install the package:

```text
npm i -D @aws-sdk/client-sqs
```

Needed to add empty configuration to `const sqs = new SQS();` -> ``const sqs = new SQS({});`

```text
  SimpleMessageRouter Test Suite
spec.js:54
    √ Routes as expected: {"values":[],"isExpectedPositive":true} (4178ms)
spec.js:83
    √ Routes as expected: {"values":[1,2,3],"isExpectedPositive":true} (2122ms)
spec.js:83
    √ Routes as expected: {"values":[1,2,-3],"isExpectedPositive":true} (2105ms)
spec.js:83
    √ Routes as expected: {"values":[1,-2,-3],"isExpectedPositive":false} (2133ms)
spec.js:83
    √ routes to DLQ (10426ms)
spec.js:83
    √ retries (6380ms)
spec.js:83
  6 passing (28s)
```

So success, but the style looks a little different from the SNS.

> TODO: Does the change in SDK have a major impact on local testing?

CodeWhisperer came up with an alternative:

```TypeScript
// Send an SQS message using v3 sdk
const sendMessageRequest: AWS_SQS.SendMessageRequest = {
    QueueUrl: outputQueueUrl,
    MessageBody: JSON.stringify(numbersMessage),
};
await sqs.sendMessage(sendMessageRequest);
```

[The documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/preview/client/sqs/command/SendMessageCommand/) points you down the SQS client route:

```javascript
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs"; // ES Modules import
const client = new SQSClient(config);
const input = {
  // SendMessageRequest
  QueueUrl: "STRING_VALUE", // required
  MessageBody: "STRING_VALUE", // required
};
const command = new SendMessageCommand(input);
const response = await client.send(command);
```

This approach worked as well, so we have three possible ways:

- Use `SQS.sendMessage()`
  - With `SendMessageCommandInput`
  - With `SendMessageRequest`
- Use `SQSClient.send()` with `SendMessageCommand`

So, which to use?

[v2 compatible style](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/#v2-compatible-style)

> The client can also send requests using v2 compatible style. However, it results in a bigger bundle size and may be dropped in next major version. More details in the blog post on [modular packages in AWS SDK for JavaScript](Modular packages in AWS SDK for JavaScript)
