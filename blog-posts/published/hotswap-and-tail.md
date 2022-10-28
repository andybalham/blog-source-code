In this post we use a worked example to look at two ways we can help speed up development of Lambda functions. One is to use the [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-getting-started.html) to tail function logs, and the other is to use the new `--hotswap` flag when deploying with the [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/cli.html).

All the code for this post is available on my [GitHub repo](https://github.com/andybalham/blog-source-code/tree/master/hotswap-and-tail).

## TL;DR

- Use the `--hotswap` if you are in development environment to speed up Lambda development 💨
- Don't **ever, ever** use `--hotswap` if you are in a production environment ⛔
- You can tail logs with the SAM CLI, even if you are using CDK 📃

# Setting the scene

Our story starts with the development of a CDK construct that subscribes to an SNS topic, process them with a Lambda function and, depending on the event attributes, routes the messages to one of two SQS queues.

To test the construct, we have also created an integration test stack. This is used to deploy the construct, so we can test it in the cloud. For further details on this approach, see my earlier series on [Serverless Testing with the AWS CDK](https://www.10printiamcool.com/series/integration-test-with-cdk). 

The diagram below shows the results of our efforts.

![blog-deadline-router.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1636816385188/YGaz_6suM.jpeg)

## Debugging the slow way

The construct routes events on a SNS message attribute called `Deadline`. Using my [Serverless Testing Toolkit](https://www.npmjs.com/package/@andybalham/sls-testing-toolkit) we have set up [four tests](https://github.com/andybalham/blog-source-code/blob/master/hotswap-and-tail/test/DeadlineRouter.test.ts) for the following scenarios:

1. No attribute specified, expect normal priority
1. Invalid date specified, expect normal priority
1. Date specified more than 3 days from today, expect normal priority
1. Date specified less than 3 days from today, expect high priority

However, when we run the tests we see the following.

```
DeadlineRouter Test Suite
  ✔ Routes as expected: {"isExpectedHigh":false} (4181ms)
  ✔ Routes as expected: {"deadline":"<invalid>","isExpectedHigh":false} (2134ms)
  ✔ Routes as expected: {"deadline":"2021-11-09T13:40:38.056+00:00","isExpectedHigh":false} (2114ms)
  1) Routes as expected: {"deadline":"2021-11-11T13:40:38.065+00:00","isExpectedHigh":true}
```

The first thing to do is to do a quick visual inspection of the code.

```TypeScript
export const handler = async (event: SNSEvent): Promise<void> => {
  for await (const record of event.Records) {
    const deadlineString =
      record.Sns.MessageAttributes.Readline?.Value as string;
      //                           ^^^^^^^^
    const isHighPriority = getIsHighPriority(deadlineString);
```

It seems that we must have had text processing on our minds when we wrote our code. No problem, we can fix the typo and do a `cdk deploy`. A bit tedious, but not the end of the world. For the purposes of comparison later on, we use a stopwatch to time how long the deployment takes...

## 64 seconds later

With our fix in place, we re-run our tests and see the following.

```
DeadlineRouter Test Suite
  ✔ Routes as expected: {"isExpectedHigh":false} (4200ms)
  ✔ Routes as expected: {"deadline":"<invalid>","isExpectedHigh":false} (2682ms)
  1) Routes as expected: {"deadline":"2021-11-09T13:54:05.798+00:00","isExpectedHigh":false}
  ✔ Routes as expected: {"deadline":"2021-11-11T13:54:05.806+00:00","isExpectedHigh":true} (2165ms)
```

So things have definitely changed, but there is clearly still some work to do. Time to fall back on our old standby of sprinkling some `console.log` dust on our code.

```TypeScript
function getIsHighPriority(deadlineString: string): boolean {
  console.log(JSON.stringify({ deadlineString }, null, 2));

  if (!deadlineString) {
    return false;
  }

  const deadlineDate = DateTime.fromISO(deadlineString);
  console.log(JSON.stringify({ deadlineDate }, null, 2));

  if (!deadlineDate.isValid) {
    return false;
  }

  const durationLeftDays = deadlineDate.diff(DateTime.now(), 'days').days;
  console.log(JSON.stringify({ durationLeftDays }, null, 2));

  const highPriorityThresholdDays =
      parseInt(process.env[HIGH_PRIORITY_THRESHOLD_DAYS] ?? '0', 10);
  console.log(JSON.stringify({ highPriorityThresholdDays }, null, 2));

  return durationLeftDays <= highPriorityThresholdDays;
}
```

Now, this time we decide to use the new `--hotswap` flag with `cdk deploy`. The [PR](https://github.com/aws/aws-cdk/pull/15748) for this says:

> It adds a (boolean) `--hotswap` flag to the `deploy` command that attempts to perform a short-circuit deployment, updating the resource directly, and skipping CloudFormation.

> If we detect that the current change cannot be short-circuited (because it contains an infrastructure change to the CDK code, most likely), we fall back on performing a full CloudFormation deployment, same as if `cdk deploy` was called without the `--hotswap` flag.

## 12 seconds later

Yes, it only took 12 seconds this time. However, there were a few caveats thrown by the CLI.

```
⚠️ The --hotswap flag deliberately introduces CloudFormation drift to speed up deployments
⚠️ It should only be used for development - never use it for your production Stacks!
```

This point cannot be stressed enough. However, in our case we have an ephemeral deployment purely for the purposes of testing. Given that, this option is ideal for what we want to do.

Now to run the tests and see what we find.

## A tale of two CLIs

To quote [AWS](https://aws.amazon.com/serverless/sam/):

> The AWS Serverless Application Model (SAM) is an open-source framework for building serverless applications. It provides shorthand syntax to express functions, APIs, databases, and event source mappings.

Now although we are using CDK and not SAM for our infrastructure, SAM has a CLI that has some useful features. One of those is the ability to tail logs without having to go into the AWS console.

We install the SAM CLI and read the following in the [logging guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-logging.html).

> You can fetch logs by using the function's name: `sam logs -n mystack-HelloWorldFunction-1FJ8PD`

We use the [AWS Toolkit](https://aws.amazon.com/visualstudiocode/) to identify the name of our function and issue the following command.

```
sam logs --name DeadlineRouterTestStack-SUTRouterFunction11A6E8DD-g0upBJpeuFqK --tail
```

Unfortunately, we get the following unfriendly error and stack trace.

```
  File "runpy.py", line 194, in _run_module_as_main
  File "runpy.py", line 87, in _run_code
  File "C:\Program Files\Amazon\AWSSAMCLI\runtime\lib\site-packages\samcli\__main__.py", line 12, in <module>
    cli(prog_name="sam")
  ...
ValueError: Required parameter name not set
```

Maybe we have done something wrong, maybe this feature is not ready yet. Our googling and efforts turn up no nothing, so perhaps we can try a different method. The documentation also says:

> When your function is a part of an AWS CloudFormation stack, you can fetch logs by using the function's logical ID: `sam logs -n HelloWorldFunction --stack-name mystack`

What we need here is the logical ID. We can get from the synthesized CloudFormation:

```json
    "SUTRouterFunction11A6E8DD": {
      "Type": "AWS::Lambda::Function",
```

Another alternative is to derive it manually from the deployed name. In our case, this was `SUTRouterFunction11A6E8DD`, so we try the following in a command window.

```
sam logs --stack-name DeadlineRouterTestStack -n RouterFunction11A6E8DD --tail
```

Running our tests, we then start to see the logs arrive in our console window. No more searching around in the AWS console 🎆 What is more, we can see the following values being logged for the `durationLeftDays` value.

![sam-tail.png](https://cdn.hashnode.com/res/hashnode/image/upload/v1636882158019/w-FKrLZ-A.png)

It doesn't look likely that this value will ever be greater than 3. Looking at the code, we spot that we had the dates the wrong way round.

```TypeScript
  const durationLeftDays = deadlineDate.diff(DateTime.now(), 'days').days;
  //                       ^^^^^^^^^^^^      ^^^^^^^^^^^^^^
  console.log(JSON.stringify({ durationLeftDays }, null, 2));
}
```

A quick code change and `cdk deploy --hotswap` later, in less than a minute we see the following that confirms the construct is working as expected.

```
DeadlineRouter Test Suite
  ✔ Routes as expected: {"isExpectedHigh":false} (4201ms)
  ✔ Routes as expected: {"deadline":"<invalid>","isExpectedHigh":false} (2175ms)
  ✔ Routes as expected: {"deadline":"2021-11-09T14:37:20.141+00:00","isExpectedHigh":false} (2211ms)
  ✔ Routes as expected: {"deadline":"2021-11-11T14:37:20.149+00:00","isExpectedHigh":true} (2163ms)
```

## Summary

We have seen how we can speed up Lambda development by combining the use of the new `--hotswap` CDK option with the ability of the SAM CLI to tail logs directly. With these two tools in our belt, we can speed up the inner development loop and iterate much more quickly on our functions whilst still having the confidence that testing in the cloud brings.