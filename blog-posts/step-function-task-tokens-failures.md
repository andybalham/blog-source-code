## Handling Step Function Task Tokens failures with CDK

TODO

In the [previous post in the series](TODO) we looked at how to implement the ['Wait for a Callback' Service Integration Pattern](https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html#connect-wait-token) using task tokens and the [CDK](https://aws.amazon.com/cdk/).

However, we only considered what happens if everything goes to plan. As you might have heard somewhere, everything fails all the time and step functions and task token are no different.

This post covers the various ways our previous application could fail and how we might handle those scenarios. All the code can be downloaded and run by cloning the [companion repo](https://github.com/andybalham/blog-task-tokens-part-2).

## Exploring the failure modes

Below is a diagram that shows the step in our state machine that makes an external service call and then waits for a task token to continue. When the service calls back via a webhook, a task token is retrieved and used to restart the state machine.

![Application overview](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/application-overview-annotated.png?raw=true)

As with any piece of software, we need to consider the ways in which things could fail. It is all too easy to just consider the happy path and then be surprised when something fails. Especially if you are left scratching your head as you don't have the information to understand and fix it.

With this in mind, let us list out some ways the integration with the valuation service could fail:

1. The valuation service could fail to respond leaving us in an unknown state.
1. The valuation service could return a response that indicates it couldn't fulfil the request.
1. The valuation service could return a reference that we do not expect.

Now we have our failure modes, let us consider how we can handle them in such a way that we can easily identify what went wrong.

## Timeouts and heartbeats

The first failure we will consider is where the valuation service fails to respond. If we do nothing, then our step function will stay stuck on the same step. Looking at the [step function quota documentation](https://docs.aws.amazon.com/step-functions/latest/dg/limits-overview.html), this will be the maximum execution time of one year.

Clearly, this is not what we want. Thankfully, the solution is quite straightforward. What we need to do is to add a timeout to the asynchronous step, as shown below.

```TypeScript
const requestValuationTask = new LambdaInvoke(this, 'RequestValuation', {
  lambdaFunction: valuationRequestFunction,
  integrationPattern: IntegrationPattern.WAIT_FOR_TASK_TOKEN,
  payload: TaskInput.fromObject({
    taskToken: JsonPath.taskToken,
    'loanApplication.$': '$',
  }),
  timeout: Duration.seconds(30), // Don't wait forever for a reply
});
```

> At first I thought that it was necessary to also set a value for `heartbeat`. It was only when writing this post that I consulted the ['Task state timeouts and heartbeat intervals' documentation](https://docs.aws.amazon.com/step-functions/latest/dg/amazon-states-language-task-state.html) and found that this wasn't the case for our example. The `heartbeat` setting is only required if the task is sending heartbeat notifications to indicate it is still progressing.

Our example includes a mock valuation service. To test the timeout, we update this [mock service](https://github.com/andybalham/blog-task-tokens-part-2/blob/master/src/valuation-service/MockValuationService.RequestHandlerFunction.ts) so that, if it receives a certain request, then it returns without initiating the callback.

```TypeScript
if (valuationRequest.property.nameOrNumber === 'No callback') {
  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(valuationRequestResponse),
  };
}
```

With this code in place, we can write a [unit test](https://github.com/andybalham/blog-task-tokens-part-2/blob/master/tests/LoanProcessor.test.ts) to send such a request with 'No callback' as the `nameOrNumber` and then see what happens. The result is shown below.

![Event history showing the task timed out error](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/event-history-task-timed-out.png?raw=true)

Now we know that our step function will not wait for year before failing. However, it does raise another question. What happens if our step function has timed out just before the response comes back from the valuation service?

## Handling late responses

To find out what happens, we turn again to our mock valuation service. This service uses an [Express Workflow](TODO) to add a delay before sending the mock response as shown below.

![Mock valuation service state machine](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/mock-service-state-machine.png?raw=true)

What we can do is vary the wait time depending on the valuation request. We do this by passing in a delay into the state machine as follows.

```TypeScript
const stateMachineData: ValuationStateMachineData = {
  ...valuationRequest,
  valuationReference,
  delaySeconds:
    valuationRequest.property.nameOrNumber === 'Late callback' ? 60 : 6,
};
```

We then bind the `Wait` step to the delay value.

```json
"Wait": {
  "Type": "Wait",
  "SecondsPath": "$.delaySeconds",
  "Next": "SendResponse"
}
```

With this in place, we can write another [unit test](https://github.com/andybalham/blog-task-tokens-part-2/blob/master/tests/LoanProcessor.test.ts) to send such a request with 'Late callback' as the `nameOrNumber` and then run it to see what happens. What we find is the following error being thrown by the Lambda function when it tries to restart the step function.

```
{
  "errorType": "TaskTimedOut",
  "errorMessage": "Task Timed Out: 'Provided task does not exist anymore'",
  "code": "TaskTimedOut",
  "message": "Task Timed Out: 'Provided task does not exist anymore'",
  "time": "2022-07-26T18:21:39.968Z",
  "requestId": "9b5f54e3-9990-4c41-be67-9fda6c80c1f4",
  "statusCode": 400,
  "retryable": false,
  "retryDelay": 77.92116479734025,
  "stack": [
    "TaskTimedOut: Task Timed Out: 'Provided task does not exist anymore'",
    "    at Request.extractError (/var/runtime/node_modules/aws-sdk/lib/protocol/json.js:52:27)",
    "    at <snip>",
    "    at Request.callListeners (/var/runtime/node_modules/aws-sdk/lib/sequential_executor.js:116:18)"
  ]
}
```

So now we know what to expect when the service either doesn't reply or doesn't reply in time. The next question is how might we handle these situations.

## Notifying ourselves of failure

In my blog post [Better logging through technology](https://www.10printiamcool.com/better-logging-through-technology), I ask developers to see logging through the eyes of support. That is, put yourself in the position where something has gone wrong and you need to work out what. 

In our case, we know that the valuation service step throws a `States.Timeout` error when the timeout is exceeded. What we will do is amend the step function to publish an SNS message to an error topic. This will give us flexibility to subscribe to this topic and do a range of actions, such as email. 

![Workflow Studio showing the step that publishes errors](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/workflow-studio-publish-error.png?raw=true)

When things do go wrong, we want to be as helpful to those on support as we can. This means sending information that will allow someone to go directly to the thing that failed. For this, we are using the [Step Function Context object](https://docs.aws.amazon.com/step-functions/latest/dg/input-output-contextobject.html).

By using the `$$` prefix, we can publish useful information along with our message. In this case, the ids of the state machine and the execution along with the start time of the execution. This information can then be used to identify exactly what has failed and when. Then the investigations can begin.

To handle the scenario where the service doesn't reply in time, we can add a `try/catch` in the Lambda function and have that publish the error to our error topic. In this case, we use the [AWS Lambda context object in Node.js](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html) to get hold of the function ARN.

```TypeScript
} catch (error: any) {

  const publishError: PublishInput = {
    Message: JSON.stringify({
      source: context.invokedFunctionArn,
      description: error.message,
      eventRequestId: event.requestContext.requestId,
      eventBody: event.body,
    }),
    TopicArn: errorTopicArn,
  };

  await sns.publish(publishError).promise();
}
```

Here we try to keep to a convention of having a `source` and `description`, along with error-specific values. A bit of consistency is never a bad thing.

## Handling failed requests

TODO

Talk about the mock valuation service

## Links

- ['Wait for a Callback' Service Integration Pattern](https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html#connect-wait-token)
- [Step function quotas](https://docs.aws.amazon.com/step-functions/latest/dg/limits-overview.html)
