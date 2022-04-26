TODO: Title?

# Creating composable CDK constructs

In this post we demonstrate the power of composable CDK constructs. We build a generic construct to add retry functionality to idempotent state machines.

TODO: GitHub

## TL;DR

- Think about the interface first
- Keep coupling one-way
- Think idempotent

## The requirement

Our starting point is a state machine that makes a sequence of HTTP API calls and sends the result to an 'Output' SQS queue. If any of the calls fail, then the state is sent to a 'Failure' SQS queue. See an earlier [post](TODO) for a full description of how this was built.

![Diagram of the state machine with question - TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/composable-cdk-constructs/state-machine.png?raw=true)

Our challenge is to add retry functionality. That is, if one API is erroring, we can wait until it is fixed and then push the requests back through the state machine.

In addition to this basic requirement, we add one of our own. We want to make this additional functionality generic, so that it can be easily reused for other similar state machines.

## The solution

Our solution is to create a `Retrier` construct, consisting of two Lambda functions and an SQS queue and attach it to the state machine construct.

![Diagram of the state machine with the retrier construct](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/composable-cdk-constructs/state-machine-with-retrier.png?raw=true)

The first Lambda function subscribes to the 'Failure' SQS queue and sends messages to its own 'Retry' SQS queue. A second Lambda function then replays the requests from this queue, back into the state machine.

There is a big danger here, which is that we now have a loop. If we are not careful, when the state machine errors we will end up in a tight loop, spinning up Lambda functions and incurring the corresponding costs.

To avoid this, we have two 'taps'. These taps are the 'Enabled' settings on the Lambda function triggers. In normal operation, tap 1 is enabled and failures are sent to the 'Retry' SQS queue. When failures have occurred, but we believe it is good to retry, tap 1 is disabled and tap 2 is enabled. The requests are then replayed and, hopefully, processed successfully. Tap 2 is then disabled, before tap 1 is enabled again.

As long as both taps are not enabled at once, we avoid any possibility of runaway Lambda functions.

Note that this approach relies on the state machine being [idempotent](https://en.wikipedia.org/wiki/Idempotence). That is, requests can safely be retried multiple times with no unwanted side-effects. For a good explanation of this topic please see the following the article ['What Is Idempotence?'](https://www.bmc.com/blogs/idempotence/).

In our case, the each step of the state machine checks to see if the current state to see if it has already run. If it has, then it simply passes execution to the next step. With this approach, we can safely retry any failed request, regardless of which step failed.

## Implementing the `Retrier` construct

As with all components, the first thing to do is think about the interface. In our case, this has two inputs and no outputs.

The inputs are supplied using the standard CDK `props` pattern. They are the SQS queue that will receive failed requests and the Lambda function that is to be used to retry requests.

```TypeScript
export interface RetrierProps {
  failureQueue: sqs.IQueue;
  retryFunction: lambda.IFunction;
}

export default class Retrier extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: RetrierProps) {
    super(scope, id);
  }
}
```

Now we have our interface, we can start to define the internal components. First, we define the 'Retry' queue. This will hold failed requests until we are ready to replay them to the state machine.

```TypeScript
const retryQueue = new sqs.Queue(this, 'RetryQueue', {
  receiveMessageWaitTime: cdk.Duration.seconds(20),
  visibilityTimeout: cdk.Duration.seconds(3),
});
```

The first function consumes messages from the 'Failure' queue passed in via the properties. It then writes them to the 'Retry' queue to await replaying.

The implementation of the function can be found in the [GitHub repo](TODO).

```TypeScript
const queueRetriesFunction = new lambdaNodejs.NodejsFunction(scope, 'QueueRetriesFunction', {
  description: 'Queues up the requests to be retried',
  environment: {
    'RETRY_QUEUE_URL_ENV_VAR': retryQueue.queueUrl,
  },
});

props.failureQueue.grantConsumeMessages(queueRetriesFunction);

queueRetriesFunction.addEventSource(
  new lambdaEventSources.SqsEventSource(props.failureQueue)
);

retryQueue.grantSendMessages(queueRetriesFunction);
```

The 'Retry' function is equally simple, it consumes messages from the 'Retry' queue and invokes the a Lambda function to retry the request.

The implementation of the function can be found in the [GitHub repo](TODO).

```TypeScript
const retryFunction = new lambdaNodejs.NodejsFunction(scope, 'RetryFunction', {
  description: 'Retries the queued requests',
  environment: {
    'INPUT_FUNCTION_NAME_ENV_VAR': props.retryFunction.functionName,
  },
});

retryQueue.grantConsumeMessages(retryFunction);

retryFunction.addEventSource(
  new lambdaEventSources.SqsEventSource(retryQueue, {
    enabled: false,
  })
);

props.retryFunction.grantInvoke(retryFunction);
```

For this Lambda function, we have set `enabled` to `false`. This means that, by default, the construct will consume failed requests, but not retry them until we decide.

Note how we have created a construct that makes very few assumptions of the state machine. It assumes that the requests are handled in an idempotent manner and that the state can fit within the limitations of an SQS queue message. See ['How do I configure the maximum message size for Amazon SQS?'](https://aws.amazon.com/sqs/faqs/).

## Composing the constructs

Now we have our constructs, it is time to put them together. This is a straightforward process. We simply instantiate a `LoanProcessor`, then wire up the inputs of the `Retrier` to the properties of the `LoanProcessor`.

```TypeScript
const loanProcessor = new LoanProcessor(this, 'LoanProcessor', {
});

new Retrier(this, 'Retrier', {
  failureQueue: loanProcessor.failureQueue,
  retryFunction: loanProcessor.inputFunction,
});
```

Now the power of composable constructs becomes apparent, as we can see how easily we can add this retry functionality to any state machine.

## Testing

TODO

Step through capturing a set of errors, then retrying, failing again, then succeeding

In order to

## Summary

In this post we built a construct that can be used to provide generic retry functionality to idempotent state machines. We saw how straightforward it is to compose higher-level functionality using constructs as building blocks.

## Resources

- [Constructs - AWS Documentation](https://docs.aws.amazon.com/cdk/v2/guide/constructs.html)
- [Idempotence - wikipedia](https://en.wikipedia.org/wiki/Idempotence)
- [What Is Idempotence?](https://www.bmc.com/blogs/idempotence/)
