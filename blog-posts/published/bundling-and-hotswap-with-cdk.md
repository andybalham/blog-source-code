# Title: Easy Node.js Lambda bundling with CDK

In this post, we go through a worked example showing the various ways that Node.js Lambda functions can be bundled using CDK. From doing it the hard way, to using code by convention.

Full code for this post can be found on the accompanying [GitHub repo](https://github.com/andybalham/blog-source-code/tree/master/lambda-bundling-and-hotswap).

## TL;DR

* Use the [`NodejsFunction`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda-nodejs.NodejsFunction.html) construct to make your life easy

## Introducing the Priority Router construct

The function we are going to bundle is part of a CDK construct that routes SNS events to one of two SQS queues based on a `Deadline` attribute.

Below is a diagram showing the construct and the components that make it up:

![blog-priority-router.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1635801596138/EI5RhYmDW.jpeg)

## The routing function

At the heart of the construct is the function that does the routing and the code for it is shown below. 

```TypeScript
export const HIGH_PRIORITY_THRESHOLD_DAYS = 'HIGH_PRIORITY_THRESHOLD_DAYS';
export const HIGH_PRIORITY_QUEUE_URL = 'HIGH_PRIORITY_QUEUE_URL';
export const NORMAL_PRIORITY_QUEUE_URL = 'NORMAL_PRIORITY_QUEUE_URL';

const sqs = new SQS();

export const handler = async (event: SNSEvent): Promise<void> => {
  for await (const record of event.Records) {
    const isHighPriority = false; // Route everything as normal for now

    const outputQueueUrl = isHighPriority
      ? process.env[HIGH_PRIORITY_QUEUE_URL]
      : process.env[NORMAL_PRIORITY_QUEUE_URL];

    if (outputQueueUrl === undefined) 
      throw new Error('outputQueueUrl === undefined');

    const outputMessageRequest: SendMessageRequest = {
      QueueUrl: outputQueueUrl,
      MessageBody: record.Sns.Message,
    };

    const outputMessageResult = 
      await sqs.sendMessage(outputMessageRequest).promise();
  }
};
```

As you can see, the initial implementation is going to default to send all messages to the normal priority queue. We will add the real processing later.

## The `PriorityRouter` construct

The full code for the `PriorityRouter` construct can be found in the accompanying [repo](https://github.com/andybalham/blog-source-code/blob/master/lambda-bundling-and-hotswap/src/event-router/PriorityRouter-v4.ts). It takes an SNS queue as input and creates two SQS queues as output, one for high priority messages and one for normal messages.

For the function, we use the `Function` construct and `Code.fromAsset` to point it to the `outDir` as defined in `tsconfig.json`.

```TypeScript
const priorityRouterFunction = new lambda.Function(this, 'PriorityRouterFunction', {
  code: 
    lambda.Code.fromAsset('dist/src/event-router'), // outDir from tsconfig.json
  handler: 'priorityRouterFunction.handler',
  runtime: lambda.Runtime.NODEJS_14_X,
  environment: {
    [HIGH_PRIORITY_QUEUE_URL]: this.highPriorityQueue.queueUrl,
    [NORMAL_PRIORITY_QUEUE_URL]: this.normalPriorityQueue.queueUrl,
    [HIGH_PRIORITY_THRESHOLD_DAYS]: props.highPriorityThresholdDays.toString(),
  },
});
```

To test the construct, a test stack was created to act as a test harness so that the construct could be tested in isolation, see the [repo](https://github.com/andybalham/blog-source-code/tree/master/lambda-bundling-and-hotswap) for details of the [test stack](https://github.com/andybalham/blog-source-code/blob/master/lambda-bundling-and-hotswap/lib/PriorityRouterTestStack.ts) and [unit tests](https://github.com/andybalham/blog-source-code/blob/master/lambda-bundling-and-hotswap/test/PriorityRouter.test.ts). 

> This approach was covered in my series on [Serverless Testing with CDK](https://www.10printiamcool.com/series/integration-test-with-cdk) and uses my [Serverless Testing Toolkit](https://www.npmjs.com/package/@andybalham/sls-testing-toolkit) npm package.

The test stack was deployed using `cdk deploy` and the tests run.

## Add routing implementation

With the default behaviour verified, the next step was to add the processing of the `Deadline` attribute on the SNS event. To do this, the [luxon](https://www.npmjs.com/package/luxon?activeTab=readme) npm package was chosen and the code updated as follows.

```TypeScript
import { DateTime } from 'luxon';

export const handler = async (event: SNSEvent): Promise<void> => {
    // snip
    const deadlineString = record.Sns.MessageAttributes.Deadline?.Value as string;
    const isHighPriority = getIsHighPriority(deadlineString);
    // snip
};

function getIsHighPriority(deadlineString: string): boolean {
  if (!deadlineString) {
    return false;
  }

  const deadlineDate = DateTime.fromISO(deadlineString);
  if (!deadlineDate.isValid) {
    return false;
  }

  const durationLeftDays = DateTime.now().diff(deadlineDate, 'days').days;
  const highPriorityThresholdDays = 
    parseInt(process.env[HIGH_PRIORITY_THRESHOLD_DAYS] ?? '0', 10);
  return durationLeftDays <= highPriorityThresholdDays;
}
```

The test stack was redeployed, the tests re-run and promptly failed 😢

## The problem with dependencies

When the logs were checked, they revealed the following error.

```
2021-10-31T12:35:14.698+00:00	2021-10-31T12:35:14.698Z	
  undefined	ERROR	Uncaught Exception 	
  {
    "errorType":"Runtime.ImportModuleError",
    "errorMessage":"Error: Cannot find module 'luxon' <snip>
  }
```

The problem is that any dependencies are not bundled with the function by default. You don't need to bundle `aws-sdk`, as it is automatically available, but any other dependencies you do. The solution is to manually bundle the code yourself or use a bundling tool such as [webpack](https://webpack.js.org/) or [esbuild](https://esbuild.github.io/). 

> As well as solving this problem, bundling with one of these tools will speed up cold starts. It does this by reducing the overall package size and reducing the file access, as all code ends up in a single file.

## Bundling with `esbuild`

After [installing `esbuild`](https://esbuild.github.io/getting-started/#install-esbuild), the following script was added to package.json as `bundle-lambda`. 

```
./node_modules/.bin/esbuild src/event-router/priorityRouterFunction.ts
  --bundle --platform=node --target=node14 --external:aws-sdk 
  --outfile=esbuild-output/priorityRouterFunction.js
```

Running `npm run bundle-lambda` resulted in the function and all its dependencies being written to the `esbuild-output` directory.

With the code now bundled with its dependencies, the construct was updated to point to the new location.

```TypeScript
const priorityRouterFunction = new lambda.Function(this, 'PriorityRouterFunction', {
  code: lambda.Code.fromAsset('esbuild-output'), // Output from esbuild
  handler: 'priorityRouterFunction.handler',
  // snip
});
```

After running `cdk deploy`, the tests were re-run and all passed. It seemed the bundling had worked, but we can make it even easier.

## `NodejsFunction` for the win

The `NodejsFunction` construct simplifies the bundling by allowing you to supply the `.js` or `.ts` file for your function handler and it will use `esbuild` behind the scenes to automatically bundle it for you. With this, the code became even simpler and removed the need to use the `bundle-lambda` script.

```TypeScript
const priorityRouterFunction = new lambdaNodejs.NodejsFunction(this, 'PriorityRouterFunction', {
  entry: path.join(__dirname, 'priorityRouterFunction.ts'), // Current directory
  handler: 'handler',
  // snip
});
```

> If you are creating an npm package for a construct that contains a function such as this, then the package may not contain the `.ts` file. In this case, it may be necessary to make the construct code to probe for the existence of the `.ts` file first and fall back to the `.js` file if not found.

The final option take the simplification one step further using coding by convention. The convention in this case is that if you do not specify a value for `entry`, then NodejsFunction will look for a `.ts` or `.js` file based on the name of the construct file and the function id.

```TypeScript
const priorityRouterFunction = new lambdaNodejs.NodejsFunction(this, 'PriorityRouterFunction', {
  handler: 'handler',
  // snip
});
```

For example, if the above code was in a construct file `PriorityRouter` then `NodejsFunction` would look for a file called `PriorityRouter.PriorityRouterFunction.ts` or `PriorityRouter.PriorityRouterFunction.js` that contains an exported function called `handler`.

## Summary

CDK gives us a simple way to bundle our Node.js functions. Why do it the hard way? 😜

