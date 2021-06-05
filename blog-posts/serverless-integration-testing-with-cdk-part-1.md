From my own experience and that I have read of others, one of the biggest challenges of serverless is how to test. Beyond unit testing, do you try to replicate cloud infrastructure locally or rely on high-level end-to-end tests? With multiple resources interacting asynchronously, how can you develop repeatable, meaningful tests? Here I ponder how we might use the [AWS CDK](https://aws.amazon.com/cdk/) to help. Using it to package our serverless applications into units that can be independently deployed, tested, and then torn down.

# The system under test

For this thought experiment, let us consider a system that does a simplified affordability calculation for a loan application. The system contains a number of configurations and a number of scenarios. A configuration contains a set of values that are used in the affordability model, such as to specify how much of any overtime income is to be used. A scenario contains the details supplied by the loan applicants, such as a breakdown of the applicants income. The system automatically calculates the results for each combination of configuration and scenario whenever a new one is added or an existing one is amended. 

The system revolves around a bucket that contains JSON files with the following structure:

```JSON
{
  "header": {
    "fileType": "Configuration|Scenario|Result",
    "name": "E.g. High Risk Scenario",
    <any>
  },
  "body": {
    <any>
  }
}
```

The system only recalculates when the body contents of `Configuration` or `Scenario` files are updated. Changing the header details does not cause any recalculation. One assumption here is that the `fileType` is never changed once set.

The system design is as follows:

![affordability-full.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1622902599565/z0Ozk5FJQ.jpeg)

When a file is added or updated to the `Files` bucket an event is raised. The `Hash writer` Lambda function handles this event and calculates hashes for the `header` and `body` of the file. It then writes these to the `Hashes` DynamoDB table. The `Hashes` table raises change events that are then handled by the `File event publisher` Lambda function. The `File event publisher` function processes these events and sends notifications of the following format to the `File events` SNS topic.

```JSON
{
  "eventType": "Create|Update",
  "s3Key": "E.g. Configuration_7Jk0Sf5JsDPZt5skWFyNR.json",
  "fileType": "Configuration|Scenario|Result",
  "contentType": "Header|Body"
}
```

> Note, for the purposes of simplicity, `Delete` events are not being considered in this example.

The `Header updates` SQS queue subscribes to the `File events` SNS topic for events with a `contentType` of `Header`. The `Header writer` Lambda function processes messages from the `Header updates` queue and retrieves the `header` from the `Files` bucket. The `Header writer` function then writes the an entry of the following format to the `Headers` DynamoDB table.

```JSON
{
  "fileType": "Configuration|Scenario|Result",
  "s3Key": "E.g. Configuration_7Jk0Sf5JsDPZt5skWFyNR.json",
  "name": "E.g. High Risk Scenario",
  <any>
}
```

The `Headers` table is configured with `fileType` as the partition key and `s3Key` as the sort key. The `Header reader` Lambda function encapsulates access to the `Headers` table. It takes requests of the following format:

```JSON
{
  "fileType": "Configuration|Scenario|Result"
}
```

And returns responses as follows:

```JSON
{
  "headers": [
    {
      "fileType": "Configuration|Scenario|Result",
      "s3Key": "E.g. Configuration_7Jk0Sf5JsDPZt5skWFyNR.json",
      "name": "E.g. High Risk Scenario",
      <any>
    }
  ]
}
```

The final part of the system is the calculator. The `Body updates` SQS queue subscribes to the `File events` SNS topic for events with a `contentType` of `Body`. The `Calculation initiator` Lambda function processes messages from the `Body updates` queue and retrieves the associated file from the `Files` bucket. The `header` is then passed to the `Calculator` step function, which uses the `Header reader` function to work out the combinations to calculate, before performing each calculation and putting the results in the `Files` bucket.

> Note, in a production system we would want to add appropriate dead letter queues and other error handling. These have been left out of the example for simplicity.

# Testing

Not one part of the system we have designed is particularly complicated. In fact, the Lambda functions are going to be very simple indeed. So simple in fact, that we might query the value in building and maintaining unit tests for them. The system functionality emerges from the interaction between the various simple resources, so it seems reasonable to target our testing on verifying that those resources work together as expected.

One way to approach this is to break the system down as follows:

* Event publisher: subscribes to events from an S3 bucket, reads the file contents, and raises change events to an SNS topic
* Header index: subscribes to change events from an SNS topic, reads an S3 bucket, and exposes an API for listing the file headers
* Result calculator: subscribes to change events from an SNS topic, uses an API to list the file headers, reads files from an S3 bucket, calculates the results and puts them in the S3 bucket

![affordability-grouped.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1622908044613/rBhYP9RB8.jpeg)

With the system broken down like this, we can create CDK [constructs](https://docs.aws.amazon.com/cdk/latest/guide/constructs.html) for each part and then create individual test [stacks](https://docs.aws.amazon.com/cdk/latest/guide/stacks.html) to deploy them for testing in isolation. 

Let us first consider the `Event publisher`. 