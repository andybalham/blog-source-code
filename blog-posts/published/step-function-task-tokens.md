## Using Step Function Task Tokens with CDK

In this post, we will see how to implement the ['Wait for a Callback' Service Integration Pattern](https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html#connect-wait-token) using task tokens and the [CDK](https://aws.amazon.com/cdk/).

The pattern is described in the [AWS documentation](<(https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html#connect-wait-token)>) as follows (slight paraphrasing):

> Callback tasks provide a way to pause a workflow until a task token is returned. A task might need to wait for a human approval, integrate with a third party, or call legacy systems. For tasks like these, you can pause Step Functions indefinitely, and wait for an external process or workflow to complete. For these situations Step Functions allows you to pass a task token to the service. The task will pause until it receives that task token back.

In our example, we will have the step function call an API endpoint and then wait for a webhook to be called, before restarting the step function.

Clone the [companion repo](https://github.com/andybalham/blog-task-tokens) to run the code for yourself.

## TL;DR

- `integrationPattern` needs to be set to `IntegrationPattern.WAIT_FOR_TASK_TOKEN`
- `payload` must be specified and contain a property set to `JsonPath.taskToken`
- `payloadResponseOnly` must not be set to `true`
- Use the `sendTaskSuccess` method to restart the step function

## Application overview

Below is an overview of our application. On the left we have the step function that simulates part of a mortgage loan processing system. One step of this process is to call an external Valuation Service. This service is asynchronous and sends its response via a webhook specified in the valuation request.

![Application overview](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/application-overview.png?raw=true)

We are going to implement a mock Valuation Service that uses a step function to implement a six second delay, before it makes a call back to the loan processor via a webhook.

## Requesting a valuation

![Requesting a valuation](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/overview-diagram-step-01-request.png?raw=true)

Our step function consists of a single task that invokes a Lambda function. The definition is shown below.

```TypeScript
const requestValuationTask = new LambdaInvoke(this, 'RequestValuation', {
  lambdaFunction: valuationRequestFunction,
  integrationPattern: IntegrationPattern.WAIT_FOR_TASK_TOKEN,
  payload: TaskInput.fromObject({
    taskToken: JsonPath.taskToken, // NOT "$$.Task.Token" as in some examples
    'loanApplication.$': '$',
  }),
  // NOT payloadResponseOnly: true,
});
```

Things to note are:

- `integrationPattern` needs to be set to `IntegrationPattern.WAIT_FOR_TASK_TOKEN`.
- `payload` must be specified and contain a property set to `JsonPath.taskToken`
- If you specify `'taskToken.$': '$$.Task.Token'`, then you get the following error at synth time:
  > Error: Task Token is required in `payload` for callback. Use JsonPath.taskToken to set the token.
- If you specify `'taskToken.$': JsonPath.taskToken`, then you get the error at runtime:
  > The Parameters '~snip~' could not be used to start the Task: [The value for the field 'taskToken.$' must be a valid JSONPath or a valid intrinsic function call]
- `payloadResponseOnly` must not be set to `true`, otherwise you get the following error:
  > Error: The 'payloadResponseOnly' property cannot be used if 'integrationPattern', 'invocationType', 'clientContext', or 'qualifier' are specified.

The valuation service is a third-party service and the a request is shown below.

```TypeScript
export interface ValuationRequest {
  property: {
    nameOrNumber: string;
    postcode: string;
  };
  callbackUrl: string;
}
```

The details of the property to be valued are specified, along with a URL to be called with the actual valuation.

Below is a snippet from the [Lambda function](https://github.com/andybalham/blog-task-tokens/blob/master/src/LoanProcessor.ValuationRequestFunction.ts) that makes the call to the service. It uses the property details passed in from the step function along with callback URL obtained from the environment to make a simple call using the `axios` library.

```TypeScript
const valuationRequest: ValuationRequest = {
  property: event.loanApplication.property,
  callbackUrl,
};

const response = await axios.post(valuationServiceUrl, valuationRequest);
```

## Waiting for the callback

![Storing the task token and waiting](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/overview-diagram-step-02-store-token.png?raw=true)

The next stage of the process is to wait for the callback from the valuation service. We will need the task token when this happens, but the valuation service is not aware of the task token nor should it be.

What the valuation service does provide when we make the request is a `valuationReference`. What we can do is store the task token in a DynamoDB table, using the `valuationReference` as the key.

```TypeScript
const valuationRequestResponse = response.data as ValuationRequestResponse;

await taskTokenStore.putAsync({
  keyReference: valuationRequestResponse.valuationReference,
  taskToken: event.taskToken,
});
```

## Processing the callback

![Receiving the request and restarting the step function](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/overview-diagram-step-03-response.png?raw=true)

When the valuation callback is received, the response contains the following information:

```TypeScript
export interface ValuationResponse {
  valuationReference: string;
  propertyValue: number;
}
```

We use the `valuationReference` to look up the task token that we stored earlier. We then use the `sendTaskSuccess` method to restart the step function where we left off, passing in the valuation response as the `output` property.

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

That is all there is to getting the basic functionality working. Once other thing to note is that the Lambda function that restarts the step function requires the appropriate IAM permission to do so. This is done via the `grantTaskResponse` method, as shown below.

```TypeScript
this.stateMachine.grantTaskResponse(valuationCallbackFunction);
```

## Testing

Once deployed, we can test test either via the AWS console or by the [unit test in the companion repo](https://github.com/andybalham/blog-task-tokens/blob/master/tests/LoanProcessor.test.ts).

In the AWS console, we can submit the following request:

```json
{
  "applicationReference": "app-ref",
  "property": {
    "nameOrNumber": "999",
    "postcode": "PO1 1CE"
  }
}
```

In the graph inspector, we then see the task go blue as it waits for the callback. Then, after the six second delay, going green as the callback is received and processed.

![AWS Console showing event history](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/step-function-graph-inspector.png?raw=true)

Looking at the event history, we can clearly see the delay in the execution time. We can also see that we have passed the response from the valuation service back into the step function.

![AWS Console graph inspector showing transition](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/step-function-event-history.png?raw=true)

## Summary

In this post we saw how we can use the [CDK](https://aws.amazon.com/cdk/) to define a step function that implements the 'Wait for a Callback' Service Integration Pattern. We saw how we need to be careful in how we define the task and how we might need to store the task token if calling external services.

What we didn't consider, was what happens if things go wrong. For example, what if the valuation service never called us back? What if the valuation service returned an error or a reference we didn't understand? These are all questions for the next post 🙂

## Links

- ['Wait for a Callback' Service Integration Pattern - AWS docs](https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html#connect-wait-token)
- [Integrating AWS Step Functions callbacks and external systems - AWS docs](https://aws.amazon.com/blogs/compute/integrating-aws-step-functions-callbacks-and-external-systems/)
- [aws-step-functions-callback-example on GitHub](https://github.com/aws-samples/aws-step-functions-callback-example)
- [Best practices for using AWS StepFunctions](https://dev.to/lukvonstrom/best-practices-for-using-aws-stepfunctions-2io#use-waitfortasktoken)
