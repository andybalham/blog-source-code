Intro to say we are going to explore the bundling options with a worked example and on the way look at the hotswap functionality.

# Introducing the Priority Router

Overview of the component and diagram.

# The Priority Router function

TODO: Overview

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

    if (outputQueueUrl === undefined) throw new Error('outputQueueUrl === undefined');

    const outputMessageRequest: SendMessageRequest = {
      QueueUrl: outputQueueUrl,
      MessageBody: record.Sns.Message,
    };

    const outputMessageResult = await sqs.sendMessage(outputMessageRequest).promise();
  }
};
```

# The Priority Router construct

TODO: Overview

Focus on:

```TypeScript
const priorityRouterFunction = new lambda.Function(this, 'PriorityRouterFunction', {
  code: lambda.Code.fromAsset('dist/src/event-router'), // outDir from tsconfig.json
  handler: 'priorityRouterFunction.handler',
  runtime: lambda.Runtime.NODEJS_14_X,
  environment: {
    [HIGH_PRIORITY_QUEUE_URL]: this.highPriorityQueue.queueUrl,
    [NORMAL_PRIORITY_QUEUE_URL]: this.normalPriorityQueue.queueUrl,
    [HIGH_PRIORITY_THRESHOLD_DAYS]: props.highPriorityThresholdDays.toString(),
  },
});
```

Mention the tests

# Add routing implementation

Overview about using `luxon`

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

  const durationLeftDays = deadlineDate.diff(DateTime.now(), 'days').days;

  const highPriorityThresholdDays = parseInt(process.env[HIGH_PRIORITY_THRESHOLD_DAYS] ?? '0', 10);

  return durationLeftDays <= highPriorityThresholdDays;
}
```

# The problem with dependencies

```
2021-10-31T12:35:14.698+00:00	2021-10-31T12:35:14.698Z	undefined	ERROR	Uncaught Exception 	{"errorType":"Runtime.ImportModuleError","errorMessage":"Error: Cannot find module 'luxon'\nRequire stack:\n- /var/task/priorityRouterFunction-v1b.js <snip>}
```

# Bundling with `esbuild`

```json
  "scripts": {
    "bundle-lambda": "./node_modules/.bin/esbuild src/event-router/priorityRouterFunction.ts --bundle --platform=node --target=node14 --external:aws-sdk --outfile=esbuild-output/priorityRouterFunction.js",
  },
```

```TypeScript
const priorityRouterFunction = new lambda.Function(this, 'PriorityRouterFunction', {
  code: lambda.Code.fromAsset('esbuild-output'), // Output from esbuild
  handler: 'priorityRouterFunction.handler',
  // snip
});
```

Success, but one test fails

# Using `--hotswap` to fix the implementation

https://github.com/aws/aws-cdk/blob/master/packages/aws-cdk/README.md#hotswap-deployments-for-faster-development

`cdk deploy --hotswap`

Add a `console.log` and redeploy

```TypeScript
const durationLeftDays = deadlineDate.diff(DateTime.now(), 'days').days;

console.log(JSON.stringify({ durationLeftDays }, null, 2));
```

```json
{
  "durationLeftDays": -4.041779918981481
}
```

The fix

```TypeScript
const durationLeftDays = DateTime.now().diff(deadlineDate, 'days').days;
```


# Taking advantage of CDK bundling with `NodejsFunction`

```TypeScript
const priorityRouterFunction = new lambdaNodejs.NodejsFunction(this, 'PriorityRouterFunction', {
  entry: path.join(__dirname, 'priorityRouterFunction.ts'), // Current directory
  handler: 'handler',
  // snip
});
```

Mention the importance of getting `entry` right

Mention about dynamically probing when running from a package.

```TypeScript
const priorityRouterFunction = new lambdaNodejs.NodejsFunction(this, 'PriorityRouterFunction', {
  handler: 'handler',
  // snip
});
```

Explain `PriorityRouter.PriorityRouterFunction.ts`

