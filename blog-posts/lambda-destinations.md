[Asynchronous invocation](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html)

> When you invoke a function asynchronously, you don't wait for a response from the function code. You can configure how Lambda handles errors, and can send invocation records to a downstream resource **to chain together components of your application**.

Talk about how we are going to use destinations to loosely couple functions together.

Talk about how we invoked synchronously by accident and nothing happened.

Talk through the code, using a cut-down version:

```TypeScript
export const handler = async (state: LoanProcessorState): Promise<LoanProcessorState> => {

  const request: CreditReferenceRequest = {
    requestId: nanoid(),
    correlationId: state.input.correlationId,
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

Talk about how to assemble them together with CDK.

When testing, do screenshots showing the messages in the queues using the console.

For Construct, first the interface:

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

Then the queues, noting [long polling](TODO):

```TypeScript
this.outputQueue = new sqs.Queue(this, 'OutputQueue', {
  receiveMessageWaitTime: cdk.Duration.seconds(20),
});

this.failureQueue = new sqs.Queue(this, 'FailureQueue', {
  receiveMessageWaitTime: cdk.Duration.seconds(20),
});
```

Then our functions in reverse order.

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

Then last, the first in the chain, noting `responseOnly`:

```TypeScript
const identityCheckProxyFunction = new lambdaNodejs.NodejsFunction(
  scope,
  'IdentityCheckProxyFunction',
  {
    onSuccess: new lambdaDestinations.LambdaDestination(creditReferenceProxyFunction, {
      responseOnly: true, // auto-extract on success
    }),
    onFailure: new lambdaDestinations.SqsDestination(this.failureQueue),
  }
);
```

Then finally expose the input function:

```TypeScript
this.inputFunction = identityCheckProxyFunction;
```

# Application

Talk about how we pass the initial state in and then pass from state to state, adding details as we go.

```TypeScript
export interface LoanProcessorState {
  input: LoanProcessorInput;
  creditReference?: CreditReference;
  identityCheck?: IdentityCheck;
}
```

![Destination-based state machine](https://cdn.hashnode.com/res/hashnode/image/upload/v1647807109617/WnD-Qax-N.png)


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

```json
{
  "version": "1.0",
  "timestamp": "2019-11-24T23:08:25.651Z",
  "requestContext": {
    "requestId": "c2a6f2ae-7dbb-4d22-8782-d0485c9877e2",
    "functionArn": "arn:aws:lambda:sa-east-1:123456789123:function:event-destinations:$LATEST",
    "condition": "Success",
    "approximateInvokeCount": 1
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
