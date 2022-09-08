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

1. The service could fail to respond leaving us in an unknown state
1. The service could return a response that indicates it couldn't fulfil the request
1. The service could return a reference that we cannot match to a task token

Now we have our failure modes, let us consider how we can handle them in such a way that we can easily identify what went wrong.

## Heartbeats and timeouts

TODO

```TypeScript
      heartbeat: Duration.seconds(10),
      timeout: Duration.seconds(30),
```

TODO

Talk about the case where there is no response

Talk about the case where there is a late response

## Notifying ourselves of failure

```json
{
  "description": "The valuation failed",
  "ExecutionId.$": "$$.Execution.Id",
  "ExecutionStartTime.$": "$$.Execution.StartTime"
}
```

![Application overview with error topic](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/application-overview-with-error-topic.png?raw=true)

TODO

Talk about trying to give ourselves as much traceable info as possible.

Mention having alerts off logs as an alternative.

## Testing the failure modes ???

TODO

Talk about the mock valuation service

