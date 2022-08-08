## Using Step Function Task Tokens with CDK

In this post, we will see how to implement the ['Wait for a Callback' Service Integration Pattern](https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html#connect-wait-token) using task tokens and the [CDK](https://aws.amazon.com/cdk/).

The pattern is described in the [AWS documentation]((https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html#connect-wait-token)) as follows (slight paraphrasing):

> Callback tasks provide a way to pause a workflow until a task token is returned. A task might need to wait for a human approval, integrate with a third party, or call legacy systems. For tasks like these, you can pause Step Functions indefinitely, and wait for an external process or workflow to complete. For these situations Step Functions allows you to pass a task token to the service. The task will pause until it receives that task token back.

In our example, we will have the step function call an API endpoint and then wait for a webhook to be called, before restarting the step function.

Clone the [companion repo](https://github.com/andybalham/https://github.com/andybalham/blog-task-tokens) to run the code for yourself.

## Application overview

Below is an overview of our application. On the left we have the step function that simulates part of a mortgage loan processing system. One step of this process is to call an external Valuation Service. This service is asynchronous and sends its response via a webhook specified in the valuation request.

![Application overview](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/application-overview.png?raw=true)

We are going to implement a mock Valuation Service that uses a step function to implement a delay before making the call back to the loan processor via a webhook.

## Requesting a valuation

TODO

```TypeScript
    const requestValuationTask = new LambdaInvoke(this, 'RequestValuation', {
      lambdaFunction: valuationRequestFunction,
      integrationPattern: IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      payload: TaskInput.fromObject({
        taskToken: JsonPath.taskToken,
        'loanApplication.$': '$',
      }),
      // payloadResponseOnly: true,
    });
```

```TypeScript
  const valuationRequest: ValuationRequest = {
    property: event.loanApplication.property,
    callbackUrl,
  };

  const response = await axios.post(valuationServiceUrl, valuationRequest);
```

![Requesting a valuation](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/overview-diagram-step-01-request.png?raw=true)

## Waiting (TODO)

```TypeScript
export interface ValuationRequestResponse {
  valuationReference: string;
}
```

```TypeScript
  if (response.status !== 201) {
    throw new Error(`Unexpected response.status: ${response.status}`);
  }

  const valuationRequestResponse = response.data as ValuationRequestResponse;

  await taskTokenStore.putAsync({
    keyReference: valuationRequestResponse.valuationReference,
    taskToken: event.taskToken,
  });
```

![Storing the task token and waiting](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/overview-diagram-step-02-store-token.png?raw=true)

## Processing the callback

```TypeScript
export interface ValuationResponse {
  valuationReference: string;
  propertyValue: number;
}
```

```TypeScript
  const valuationResponse = JSON.parse(event.body) as ValuationResponse;

  const taskTokenItem = await taskTokenStore.getAsync(
    valuationResponse.valuationReference
  );

  await stepFunctions
    .sendTaskSuccess({
      taskToken: taskTokenItem.taskToken,
      output: JSON.stringify(valuationResponse),
    })
    .promise();
```

![Receiving the request and restarting the step function](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/overview-diagram-step-03-response.png?raw=true)

## Testing

TODO: Test via the console, but also mention the integration tests too.

## Notes

What wasn't clear to me?

- Where does the task token come from?
- How do you restart a step function with a token?

Follow-up post with considering timeouts and late replies.