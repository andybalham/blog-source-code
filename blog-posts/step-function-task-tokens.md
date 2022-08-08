## Using Step Function Task Tokens with CDK

In this post, we will see how to implement the ['Wait for a Callback' Service Integration Pattern](https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html#connect-wait-token) using task tokens and the [CDK](https://aws.amazon.com/cdk/).

The pattern is described in the [AWS documentation]((https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html#connect-wait-token)) as follows (slight paraphrasing):

> Callback tasks provide a way to pause a workflow until a task token is returned. A task might need to wait for a human approval, integrate with a third party, or call legacy systems. For tasks like these, you can pause Step Functions indefinitely, and wait for an external process or workflow to complete. For these situations Step Functions allows you to pass a task token to the service. The task will pause until it receives that task token back.

In our example, we will have the step function call an API endpoint and then wait for a webhook to be called, before restarting the step function.

Clone the [companion repo](https://github.com/andybalham/https://github.com/andybalham/blog-task-tokens) to run the code for yourself.

## Stepping through process flow (TODO)

Below is an overview of the application components. On the left we have the step function that simulates part of a mortgage loan processing system. One step of this process is to call an external Valuation Service. This service is asynchronous, as the valuation process could be automated or manual. Because of this, it sends its response via a webhook specified in the valuation request.

![Application overview](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/application-overview.png?raw=true)



![Requesting a valuation](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/overview-diagram-step-01-request.png?raw=true)

![Storing the task token and waiting](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/overview-diagram-step-02-store-token.png?raw=true)

![Receiving the request and restarting the step function](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/overview-diagram-step-03-response.png?raw=true)

What wasn't clear to me?

- Where does the task token come from?
- How do you restart a step function with a token?

Follow-up post with considering timeouts and late replies.