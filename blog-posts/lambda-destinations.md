# Application

![Lambda-based state machine](https://cdn.hashnode.com/res/hashnode/image/upload/v1647551973438/iSi8MY2F7.png)


# Links
* [@aws-cdk/aws-lambda-destinations module](https://docs.aws.amazon.com/cdk/api/v1/docs/aws-lambda-destinations-readme.html)

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
    "stackTrace": [ "exports.handler (/var/task/index.js:18:18)" ]
  }
}
```
