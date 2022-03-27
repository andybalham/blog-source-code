# Building a state machine with Lambda destinations and CDK

In this post we will look at how we can use [Lambda destinations](TODO) and CDK to create an asynchronous and idempotent state machine. [AWS announced Lambda destinations](https://aws.amazon.com/blogs/compute/introducing-aws-lambda-destinations/) in November 2019, so perhaps I am a little late to the party, but I hadn't yet used them and I wanted to try them out.

The code for this blog post is ready to be cloned, deployed, and run from the accompanying [GitHub repo](TODO).

## TL;DR

TODO

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

* Return the current state if it already contains the API response
* Call the API and store the response in the state
* Return the updated state

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

To test our state machine, we deploy it as part of an [Integration Test Stack](TODO) and create a [unit test](TODO) to invoke it asynchronously.

If we invoke the Lambda function synchronously, then we will get a `200 - Success` response. However, the 'success' Destination will not be invoked and our state machine will not run. I wondered if we could use the [AWS Lambda context object](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html) to see if we could check within a Lambda function if it had been invoked synchronously or not. However, as far as I could tell, this is not currently possible. So if we intend for a Lambda function to only be called asynchronously, then we need to be careful to only invoke it asynchronously. We cannot assert the calling method within the Lambda function itself.

TODO

When testing, do screenshots showing the messages in the queues using the console. Show the message contents too.

## When things go wrong

TODO

## Summary

TODO

## Notes

Talk about how the execution time does not compound.

# Links

- [@aws-cdk/aws-lambda-destinations module](https://docs.aws.amazon.com/cdk/api/v1/docs/aws-lambda-destinations-readme.html)

# Success

```TypeScript
// An sns topic for successful invocations of a lambda function
import * as sns from '@aws-cdk/aws-sns';

const myTopic = new sns.Topic(this, 'Topic');

const myFn = new lambda.Function(this, 'Fn', {
  runtime: lambda.Runtime.NODEJS_12_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset(path.join(__dirname, 'lambda-handler')),
  // sns topic for successful invocations
  onSuccess: new destinations.SnsDestination(myTopic),
})
```

# Failure

```TypeScript
// An sqs queue for unsuccessful invocations of a lambda function
import * as sqs from '@aws-cdk/aws-sqs';

const deadLetterQueue = new sqs.Queue(this, 'DeadLetterQueue');

const myFn = new lambda.Function(this, 'Fn', {
  runtime: lambda.Runtime.NODEJS_12_X,
  handler: 'index.handler',
  code: lambda.Code.fromInline('// your code'),
  // sqs queue for unsuccessful invocations
  onFailure: new destinations.SqsDestination(deadLetterQueue),
});
```

```json
{
  "version": "1.0",
  "timestamp": "2019-11-24T21:52:47.333Z",
  "requestContext": {
    "requestId": "8ea123e4-1db7-4aca-ad10-d9ca1234c1fd",
    "functionArn": "arn:aws:lambda:sa-east-1:123456678912:function:event-destinations:$LATEST",
    "condition": "RetriesExhausted",
    "approximateInvokeCount": 3
  },
  "requestPayload": {
    "Success": false
  },
  "responseContext": {
    "statusCode": 200,
    "executedVersion": "$LATEST",
    "functionError": "Handled"
  },
  "responsePayload": {
    "errorMessage": "Failure from event, Success = false, I am failing!",
    "errorType": "Error",
    "stackTrace": ["exports.handler (/var/task/index.js:18:18)"]
  }
}
```
