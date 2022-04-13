# Building a state machine with Lambda Destinations and CDK

In this post we will look at how we can use [Lambda destinations](https://aws.amazon.com/blogs/compute/introducing-aws-lambda-destinations/) and CDK to create an asynchronous and idempotent state machine. [AWS announced Lambda destinations](https://aws.amazon.com/blogs/compute/introducing-aws-lambda-destinations/) in November 2019, so perhaps I am a little late to the party, but I hadn't yet used them and I wanted to try them out.

The code for this blog post is ready to be cloned, deployed, and run from the accompanying [GitHub repo](https://github.com/andybalham/blog-lambda-destinations).

## TL;DR

- Destinations can be used to loosely couple Lambda functions together
- Destinations are not used when a Lambda function is invoked synchronously
- You can't inspect how a Lambda function is invoked

## Introduction to Lambda destinations

The blog post [Introducing AWS Lambda Destinations](https://aws.amazon.com/blogs/compute/introducing-aws-lambda-destinations/) provides a thorough introduction to the destinations, but we will cover the basics here.

To paraphrase the article above, Destinations routes the response from a Lambda invocation as follows:

> - **On Success** - When a function is invoked successfully, Lambda routes the record to the destination resource for every successful invocation.
> - **On Failure** - When a function invocation fails, Destinations routes the record to the destination resource for every failed invocation for further investigation or processing.

A destination resource can be one of the following targets:

- [SQS](https://aws.amazon.com/sqs/)
- [SNS](https://aws.amazon.com/sns/)
- [Lambda](https://aws.amazon.com/lambda/)
- [EventBridge](https://aws.amazon.com/eventbridge/)

Now, as the AWS documentation [Asynchronous invocation](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html) says:

> When you invoke a function asynchronously, you don't wait for a response from the function code. You can configure how Lambda handles errors, and can send invocation records to a downstream resource **to chain together components of your application**.

We are going to take advantage of this ability to chain components together to create a simple state machine.

## The state machine

The state machine we are going to build is shown below. It is going to take an input state, then make a call to an identity check service and a credit check service, before outputting the result to a 'success' SQS queue. If either calls fail, the error and state is going to be sent to a 'failure' SQS queue. We are going to wrap all this in a [CDK construct](https://docs.aws.amazon.com/cdk/v2/guide/constructs.html).

![Destination-based state machine](https://cdn.hashnode.com/res/hashnode/image/upload/v1647807109617/WnD-Qax-N.png)

The following interface shows the structure of the data that is passed through the state machine. The state machine is called with the `input` property populated, then the Lambda functions add the `identityCheck` and `creditReference` values. The final result is then sent to the 'success' SQS queue for further processing.

```TypeScript
export interface LoanProcessorState {
  input: {
    firstName: string;
    lastName: string;
    postcode: string;
  };
  identityCheck?: {
    electoralRole: boolean;
    bankAccount: boolean;
  };
  creditReference?: {
    creditReferenceRating: 'Good' | 'Bad' | 'Poor';
  };
}
```

## Yes, Step Functions would work as well

At this point, it is worth mentioning that [Step Functions](https://aws.amazon.com/step-functions/) would be a good solution for a problem such as this. One advantage of this approach for simple chains is that it incurs no additional charge. However, since our example is not long-running, [express workflows](https://aws.amazon.com/about-aws/whats-new/2019/12/introducing-aws-step-functions-express-workflows/) would address that concern. One definite advantage that Step Functions would have is that, as the service calls are independent, they could be performed in parallel.

## The Lambda functions

Both Lambda functions follow the same pattern:

- Return the current state if it already contains the API response
- Call the API and store the response in the state
- Return the updated state

Note that the Lambda functions have no knowledge of the other, they only have a dependency on the state. We will use Destinations to link them together.

The code for the credit reference Lambda function is shown below:

```TypeScript
export const handler =
  async (state: LoanProcessorState): Promise<LoanProcessorState> => {

  if (state.creditReference) {
    return state;
  }

  const request: CreditReferenceRequest = {
    firstName: state.input.firstName,
    lastName: state.input.lastName,
    postcode: state.input.postcode,
  };

  let httpResponse = await callEndpointAsync(request);

  state.creditReference = {
    creditReferenceRating: httpResponse.data.rating,
  };

  return state;
};
```

## Assembling the construct

As for any construct, we first define the interface. That is, what we need to pass in and what we need to expose. In this case, we don't need to pass anything in, but we do need to expose the function to call and the two queues were the result or the error will be sent.

```TypeScript
export default class LoanProcessor extends cdk.Construct {
  readonly inputFunction: lambda.IFunction;
  readonly outputQueue: sqs.IQueue;
  readonly failureQueue: sqs.IQueue;

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);
  }
}
```

Next we define the queues, using [long polling](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-short-and-long-polling.html):

```TypeScript
this.outputQueue = new sqs.Queue(this, 'OutputQueue', {
  receiveMessageWaitTime: cdk.Duration.seconds(20),
});

this.failureQueue = new sqs.Queue(this, 'FailureQueue', {
  receiveMessageWaitTime: cdk.Duration.seconds(20),
});
```

Then we define our functions in reverse order.

First the last in the chain:

```TypeScript
const creditReferenceProxyFunction = new lambdaNodejs.NodejsFunction(
  scope,
  'CreditReferenceProxyFunction',
  {
    onSuccess: new lambdaDestinations.SqsDestination(this.outputQueue),
    onFailure: new lambdaDestinations.SqsDestination(this.failureQueue),
  }
);
```

Then the first in the chain:

```TypeScript
const identityCheckProxyFunction = new lambdaNodejs.NodejsFunction(
  scope,
  'IdentityCheckProxyFunction',
  {
    onSuccess: new lambdaDestinations.LambdaDestination(creditReferenceProxyFunction, {
      responseOnly: true, // Don't wrap the output
    }),
    onFailure: new lambdaDestinations.SqsDestination(this.failureQueue),
  }
);
```

Note that we are specifying `true` for the `responseOnly` property. To quote the documentation:

> When set to `true` and used as `onSuccess` destination, the destination function will be invoked with the payload returned by the source function.

This will ensure that just the `LoanProcessorState` structure will be passed between our functions. If we do not set this, then it will be wrapped as follows:

```json
{
  "version": "1.0",
  "timestamp": "2019-11-24T23:08:25.651Z",
  "requestContext": {
    // Snip
  },
  "requestPayload": {
    "Success": true
  },
  "responseContext": {
    "statusCode": 200,
    "executedVersion": "$LATEST"
  },
  "responsePayload": "<data returned by the function here>"
}
```

Finally, we expose the input function so that our state machine can be called:

```TypeScript
this.inputFunction = identityCheckProxyFunction;
```

## Testing the happy path

To test our state machine, we deploy the construct as part of an [Integration Test Stack](https://github.com/andybalham/blog-lambda-destinations/blob/master/lib/LoanProcessorTestStack.ts) and create a [unit test](https://github.com/andybalham/blog-lambda-destinations/blob/master/test/LoanProcesor.test.ts) to invoke it asynchronously.

> If we invoke the Lambda function synchronously, then we will get a `200 - Success` response. However, the 'success' Destination will not be invoked and our state machine will not run. I wondered if we could use the [AWS Lambda context object](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html) to see if we could check within a Lambda function if it had been invoked synchronously or not. However, as far as I could tell, this is not currently possible. So if we intend for a Lambda function to only be called asynchronously, then we need to be careful to only invoke it asynchronously. We cannot assert how the Lambda function is being called from within the Lambda function itself.

Looking at the AWS Console we can see that one of our queue contains a message:

![AWS Console showing success message](https://cdn.hashnode.com/res/hashnode/image/upload/v1648492372015/_1e3mQCnJ.png)

When we look at the message body we see the following:

```json
{
  "version": "1.0",
  "timestamp": "2022-03-28T18:21:24.430Z",
  "requestContext": {
    "requestId": "e87961f5-ca55-450b-87fe-8a29c9c41646",
    "functionArn": "arn:aws:lambda:eu-west-2:xxxxxxxxx:function:LoanProcessorTestStack-CreditReferenceProxyFunctio-XXXXXXXXX:$LATEST",
    "condition": "Success",
    "approximateInvokeCount": 1
  },
  "requestPayload": {
    "input": {
      "firstName": "Trevor",
      "lastName": "Potato",
      "postcode": "MK3 9SE"
    },
    "retryCount": 0,
    "identityCheck": {
      "bankAccount": true,
      "electoralRole": false
    }
  },
  "responseContext": {
    "statusCode": 200,
    "executedVersion": "$LATEST"
  },
  "responsePayload": {
    "input": {
      "firstName": "Trevor",
      "lastName": "Potato",
      "postcode": "MK3 9SE"
    },
    "identityCheck": {
      "bankAccount": true,
      "electoralRole": false
    },
    "creditReference": {
      "creditReferenceRating": "Good"
    }
  }
}
```

We can see the `responsePayload` property contains the output from both Lambda functions, so our state machine ran as expected and we successfully chained them together.

Note that because we are invoking the Lambda functions asynchronously, the execution time does not compound. If the first Lambda function called the second synchronously, then its execution time would include the time for the second to respond. So you would be being charged twice! Never a good thing.

## When things go wrong

To test what happens when things go wrong, we configure one of our mock API endpoints to always error. In this case, the credit reference endpoint. Now when we run our unit test, we can see the failure queue has a message in it:

![AWS Console showing failure message](https://cdn.hashnode.com/res/hashnode/image/upload/v1648493054613/-AG7qm61I.png)

When we look at the message body we see the following:

```json
{
  "version": "1.0",
  "timestamp": "2022-03-28T18:42:06.919Z",
  "requestContext": {
    "requestId": "296ebcc2-c642-4b2e-9956-9d0f581c40cc",
    "functionArn": "arn:aws:lambda:eu-west-2:XXXXXXX:function:LoanProcessorTestStack-CreditReferenceProxyFunctio-XXXXXXX:$LATEST",
    "condition": "RetriesExhausted",
    "approximateInvokeCount": 1
  },
  "requestPayload": {
    "input": {
      "firstName": "Trevor",
      "lastName": "Potato",
      "postcode": "MK3 9SE"
    },
    "identityCheck": {
      "bankAccount": true,
      "electoralRole": true
    }
  },
  "responseContext": {
    "statusCode": 200,
    "executedVersion": "$LATEST",
    "functionError": "Unhandled"
  },
  "responsePayload": {
    "errorType": "Error",
    "errorMessage": "Request failed with status code 500",
    "trace": [
      "Error: Request failed with status code 500",
      "    at createError (/var/task/index.js:335:19)",
      "    at settle (/var/task/index.js:351:16)",
      "    at IncomingMessage.handleStreamEnd (/var/task/index.js:2091:15)",
      "    at IncomingMessage.emit (events.js:412:35)",
      "    at IncomingMessage.emit (domain.js:475:12)",
      "    at endReadableNT (internal/streams/readable.js:1334:12)",
      "    at processTicksAndRejections (internal/process/task_queues.js:82:21)"
    ]
  }
}
```

In this case, we can see that the `responsePayload` contains details of the error and the `requestContext` tells us which Lambda function failed.

## Summary

In this post we saw how we can use Destinations to chain Lambda functions together to form a basic state machine. The functions were combined in a loosely-coupled way that avoided the execution time compounding. We also saw how we can add error handling to capture what went wrong when an asynchronous invocation fails.

# Links

- [@aws-cdk/aws-lambda-destinations module](https://docs.aws.amazon.com/cdk/api/v1/docs/aws-lambda-destinations-readme.html)
