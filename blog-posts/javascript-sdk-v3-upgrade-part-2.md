# Part 2

The following didn't work: `npx aws-sdk-js-codemod -t v2-to-v3 D:\Users\andyb\Documents\github\blog-enterprise-integration\@andybalham\aws-client-wrappers\DynamoDBTableClient.ts`

`Key` has become `Record<string, any>`

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

```text
[WARNING] aws-cdk-lib.aws_stepfunctions.TaskStateBaseProps#timeout is deprecated.
  use `taskTimeout`
  This API will be removed in the next major release.
[WARNING] aws-cdk-lib.aws_stepfunctions.TaskStateBaseProps#timeout is deprecated.
  use `taskTimeout`
  This API will be removed in the next major release.
[WARNING] aws-cdk-lib.aws_stepfunctions.TaskStateBaseProps#timeout is deprecated.
  use `taskTimeout`
  This API will be removed in the next major release.
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
