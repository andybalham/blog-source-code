What is our story?

- We want to show how we can use CDK to encapsulate a set of components that offer functionality that we can reuse in different scenarios.

## TL;DR

- CDK can be used to build reusable functionality ???

## The requirement

Our starting point is a state machine that makes a sequence of HTTP API calls and sends the result to an 'Output' SQS queue. If any of the calls fail, then the state is sent to a 'Failure' SQS queue. See an earlier [post](TODO) for a full description of how this was built.

![Diagram of the state machine with question - TODO](images\composable-cdk-constructs\state-machine.png)

Our challenge is to add retry functionality. That is, if one API is erroring, we can wait until it is fixed and then push the requests back through the state machine.

In addition to this basic requirement, we add one of our own. We want to make this additional functionality generic, so that it can be easily reused for other similar state machines.

## The solution

Our solution is to create a `Retrier` construct, consisting of two Lambda functions and an SQS queue and attach it to the state machine construct.

![Diagram of the state machine with the retrier construct - TODO](images\composable-cdk-constructs\state-machine-with-retrier.png)

The first Lambda function subscribes to the 'Failure' SQS queue and sends messages to its own 'Retry' SQS queue. A second Lambda function then replays the requests from this queue, back into the state machine.

There is a big danger here, which is that we now have a loop. If we are not careful, when the state machine errors we will end up in a tight loop, spinning up Lambda functions and incurring the corresponding costs.

To avoid this, we have two 'taps'. These taps are the 'Enabled' settings on the Lambda function triggers. In normal operation, tap 1 is enable and failures are sent to the `Retry` SQS queue. When failures have occurred, but we believe it is good to retry, tap 1 is disabled and tap 2 is enabled. The requests are then replayed and, hopefully, processed successfully. Tap 2 is then disabled, before tap 1 is enabled again.

Note that this approach relies on the state machine being [idempotent](https://en.wikipedia.org/wiki/Idempotence). That is, requests can safely be retried multiple times with no unwanted side-effects. For a good explanation of this topic please see the following the article ['What Is Idempotence?'](https://www.bmc.com/blogs/idempotence/).

## The implementation

Show how we can build a CDK construct that we can reuse

TODO: Another mitigation against runaway costs is provisioned concurrency of 1.


## Testing

Step through capturing a set of errors, then retrying, failing again, then succeeding

## Summary

Highlight how we now have

## Resources

- [Idempotence - wikipedia](https://en.wikipedia.org/wiki/Idempotence)
- [What Is Idempotence?](https://www.bmc.com/blogs/idempotence/)
