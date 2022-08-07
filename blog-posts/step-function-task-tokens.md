## Using Step Function task tokens with CDK

![Application overview](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/application-overview.png?raw=true)

![Requesting a valuation](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/overview-diagram-step-01-request.png?raw=true)

![Storing the task token and waiting](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/overview-diagram-step-02-store-token.png?raw=true)

![Receiving the request and restarting the step function](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/step-function-task-tokens/overview-diagram-step-03-response.png?raw=true)

What wasn't clear to me?

- Where does the task token come from?
- How do you restart a step function with a token?

Follow-up post with considering timeouts and late replies.