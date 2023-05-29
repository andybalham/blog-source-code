# Updating to Node.js 18 and AWS JavaScript SDK v3 - Part 1

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

- Use the service clients for smaller bundle size and future-proofing
- `aws-sdk-js-codemod` works OK, but the result may be deprecated
- CDK `hotswap` doesn't update the Node.js version

## Upgrade approach

My first thought was to question how should I approach the process of upgrading. Should I uninstall the `aws-sdk` package, see what breaks, then fix it all up? Or should I take a more step-by-step approach? Ultimately, I will need to uninstall the `aws-sdk` package to be sure I have amended all references, but to keep things manageable I decided to tackle the functionality service by service.

When identifying what needed to change, I noted that my codebase was not consistently explicit in the Node.js version being used. The reason for this was that the code used the `NodejsFunction` [CDK construct](https://docs.aws.amazon.com/cdk/v2/guide/constructs.html) and the default value for `runtime` is `NODEJS_14_X`.

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

As [CodeWhisperer](https://aws.amazon.com/codewhisperer/) has just been released for personal use, I decided to give it a try with the prompt 'Publish a message to the selected output topic using the javascript sdk v3' and got the following result.

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

However, when I ran my cloud-based tests, I got the failure below:

```text
  SimpleEventRouter Test Suite
spec.js:54
    1) Routes positive sums
    <snip>
  0 passing (1m)
base.js:379
  5 failing
```

Looking in CloudWatch, I could see that the `@aws-sdk/client-sns` package could not be found.

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

The reason for this turned out to be that I was using the [`--hotswap`](https://docs.aws.amazon.com/cdk/v2/guide/cli.html) option with `cdk deploy`. This updates the Lambda function code, but not the runtime. As `@aws-sdk/client-sns` is not bundled with the Node.js 14 runtime, we get the error above.

When a full deployment was done, we got the happy sight of all the tests passing. As these are cloud-based, I have a high-confidence in a successful migration.

```text
  SimpleEventRouter Test Suite
spec.js:54
    √ Routes positive sums (4175ms)
    <snip>
  5 passing (13s)
```

## SQS next with `aws-sdk-js-codemod`

The [AWS documentation](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrating-to-v3.html) on upgrading mentions a package called [aws-sdk-js-codemod](https://www.npmjs.com/package/aws-sdk-js-codemod). To quote the README, 'This repository contains a collection of codemod scripts for use with JSCodeshift that help update AWS SDK for JavaScript APIs.' This sounded promising, so I decided to give it a go.

I followed the instructions and ran the following, pointing at TypeScript file with SQS references.

```text
npx aws-sdk-js-codemod -t v2-to-v3 PATH...
```

The results can be seen below.

![codemod import updates](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/upgrade-to-sdk-v3/codemod-sqs-upgrade-1.png?raw=true)

![codemode code updates](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/upgrade-to-sdk-v3/codemod-sqs-upgrade-2.png?raw=true)

This all look reasonable. I needed to install the `@aws-sdk/client-sqs` package and to add an empty configuration to the `SQS` constructor (`new SQS({});`), but after that I was able to deploy and test.

```text
  SimpleMessageRouter Test Suite
spec.js:54
    √ Routes as expected: {"values":[],"isExpectedPositive":true} (4178ms)
    <snip>
  6 passing (28s)
```

So success, but the style looks a little different from the SNS.

## Why does `codemod` SQS code differ from the SNS code?

I decided to ask CodeWhisperer how to send an SQS message using the v3 SDK and got another way.

```TypeScript
// Send an SQS message using v3 sdk
const sendMessageRequest: AWS_SQS.SendMessageRequest = {
    QueueUrl: outputQueueUrl,
    MessageBody: JSON.stringify(numbersMessage),
};
await sqs.sendMessage(sendMessageRequest);
```

I was getting, if not confused, a little intrigued by these alternatives. Reading the
[AWS documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/preview/client/sqs/command/SendMessageCommand/), I could see that it points you down the `SQSClient` route as shown below.

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

I tried this approach and, unsurprisingly, this worked as well. So now, we have three possible ways:

- Use `SQS.sendMessage()`
  - With `SendMessageCommandInput`
  - With `SendMessageRequest`
- Use `SQSClient.send()` with `SendMessageCommand`

> `SendMessageCommandInput` turns out to be a subclass of `SendMessageRequest` as documented [here](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/modules/sendmessagerequest.html).

So, which to use?

I dug a little further into the documentation and found this on the ['v2 compatible style'](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/#v2-compatible-style) (highlighting my own).

> The client can also send requests using v2 compatible style. However, it results in a bigger bundle size and __may be dropped in next major version__. More details in the blog post on [modular packages in AWS SDK for JavaScript](https://aws.amazon.com/blogs/developer/modular-packages-in-aws-sdk-for-javascript/)

The key takeaway for me here is that if you take the easiest approach now with your codebase, then you may face another round of updates if your application sees out the support lifetime of SDK v3. I noted that this is the approach that the `aws-sdk-js-codemod` defaults to, so that is something to bear in mind.

## Summary

So far, the process of updating has been pretty painless. Admittedly, I have been tackling a small codebase and only two AWS services. On a larger codebase that has not wrapped the AWS services in more domain-level abstractions, then this could be quite a task. Especially if it is not easy to exercise the code thoroughly in the cloud.

In the next post, I will move on to updating the rest of the AWS services being used, including DynamoDB and the marshalling challenge.
