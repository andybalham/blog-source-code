# Moving to Node.js 18 and AWS JavaScript SDK v3 - Part 1

With the announcement of the [Node.js 18.x runtime being available in AWS Lambda](https://aws.amazon.com/blogs/compute/node-js-18-x-runtime-now-available-in-aws-lambda/), AWS also changed the included version of the [AWS SDK for JavaScript](https://aws.amazon.com/sdk-for-javascript/).

> Up until Node.js 16, Lambda’s Node.js runtimes have included the AWS SDK for JavaScript version 2. This has since been superseded by the AWS SDK for JavaScript version 3, which was released in December 2020. With this release, Lambda has upgraded the version of the AWS SDK for JavaScript included with the runtime from v2 to v3.

I also noted that when doing development, I was being nagged as follows.

```text
(node:16616) NOTE: We are formalizing our plans to enter AWS SDK for JavaScript (v2) into maintenance mode in 2023.

Please migrate your code to use AWS SDK for JavaScript (v3).
For more information, check the migration guide at https://a.co/7PzMCcy
```

The announcement and the nag sufficiently motivated myself to look at my [CDK Cloud Test Kit](https://github.com/andybalham/cdk-cloud-test-kit) and make the leap from SDK v2 to v3, whilst documenting my experience along the way.

## TL;DR

- Use the service clients
- `aws-sdk-js-codemod` works OK, but the result may be deprecated
- CDK `hotswap` doesn't update the Node.js version

## Upgrade approach

My first thought was to question how should I approach the process of upgrading. Should I uninstall the `aws-sdk` package, see what breaks, then fix it all up? Or should I take a more step-by-step approach? Ultimately, I will need to uninstall the `aws-sdk` package to be sure I have amended all references, but to keep things manageable I decided to tackle the functionality service by service.

When identifying what needed to change, I noted that my codebase was not consistently explicit in the Node.js version being used. The reason for this was that the code used the `NodejsFunction` [CDK construct](TODO) and the default value for `runtime` is `NODEJS_14_X`.

```TypeScript
export interface NodejsFunctionProps extends FunctionOptions {
    /**
     * @default Runtime.NODEJS_14_X
     */
    readonly runtime?: lambda.Runtime;
}
```

With hindsight, in future I would favour being explicit with the runtime version. I think defaults have their place, but I feel such a key dependency deserves to have full visibility.

## SNS first

TODO: Continue from here

TODO - Elaborate on the following

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

Tests failed:

```text
  SimpleEventRouter Test Suite
spec.js:54
    1) Routes positive sums
    <snip>
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
        <snip>
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
    <snip>
  5 passing (13s)
```

## SQS next with `aws-sdk-js-codemod`

TODO - Mention `aws-sdk-js-codemod` is referenced from the documentation

Insert images here

![codemod import updates](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/upgrade-to-sdk-v3/codemod-sqs-upgrade-1.png?raw=true)

![codemode code updates](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/upgrade-to-sdk-v3/codemod-sqs-upgrade-2.png?raw=true)

Need to install the package:

```text
npm i -D @aws-sdk/client-sqs
```

Needed to add empty configuration to `const sqs = new SQS();` -> ``const sqs = new SQS({});`

```text
  SimpleMessageRouter Test Suite
spec.js:54
    √ Routes as expected: {"values":[],"isExpectedPositive":true} (4178ms)
    <snip>
  6 passing (28s)
```

So success, but the style looks a little different from the SNS.

## Why does `codemod` SQS code differ from the SNS code?

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

[This](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/modules/sendmessagerequest.html) shows that `SendMessageCommandInput` is a subclass of `SendMessageRequest`.

So, which to use?

[v2 compatible style](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/#v2-compatible-style)

> The client can also send requests using v2 compatible style. However, it results in a bigger bundle size and may be dropped in next major version. More details in the blog post on [modular packages in AWS SDK for JavaScript](Modular packages in AWS SDK for JavaScript)

## Summary

TODO

## Thoughts

- Mention the advantage of abstractions and common libraries
- Does the change in SDK have a major impact on local testing?

## Notes

[AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/index.html)
[AWS SDK for JavaScript - Developer Preview](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/preview/)
[Migrating your code to SDK for JavaScript V3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrating-to-v3.html)
Try [aws-sdk-js-codemod](https://www.npmjs.com/package/aws-sdk-js-codemod)

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
