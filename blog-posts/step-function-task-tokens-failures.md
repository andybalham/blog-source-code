## Handling Step Function Task Tokens failures with CDK

TODO

Talk about what we covered in the previous post. 

## Exploring the failure modes

TODO

Show the application overview.

![Application overview](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/application-overview.png?raw=true)

Talk about the ways that the valuation step could fail:

- Valuation service fails to respond
- Valuation service fails to respond in a timely manner
- Valuation service returns a response that indicates failure
- Valuation service returns an unknown reference

## Heartbeats and timeouts

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

