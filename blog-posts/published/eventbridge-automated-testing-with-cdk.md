Listening to podcasts and reading articles, it seems [AWS EventBridge](https://aws.amazon.com/eventbridge/) is getting quite a bit of attention. Given this, I thought I would kick its tyres myself and see if I could automate testing it in the process. This article documents that journey and what I found on the way.

All the code can be found as part of the [GitHub repo](https://github.com/andybalham/sls-testing-toolkit/tree/main/examples/notification-hub) for the [Serverless Testing Toolkit](https://www.npmjs.com/package/@andybalham/sls-testing-toolkit) package I am developing.

## TL;DR

- You can't tag event buses, despite what the [documentation](https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_TagResource.html) says.
- Invalid event patterns fail the whole deployment.
- You can't do a partial match on `source`.
- The `testEventPattern` SDK method requires different inputs than the CDK methods.

## Putting the wheels on the event bus

The first thing I wanted to do with EventBridge was create an event bus and put some events on it. The first part is straightforward enough using the [AWS CDK](https://aws.amazon.com/cdk/). I wrapped an `EventBus` instance in a [CDK Construct](https://docs.aws.amazon.com/cdk/latest/guide/constructs.html) and exposed it as a property.

```TypeScript
export default class NotificationHub extends cdk.Construct {

  static readonly NotificationHubEventBusId = 'NotificationHubEventBus';

  readonly eventBus: events.EventBus;

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    this.eventBus = new events.EventBus(this, NotificationHub.NotificationHubEventBusId);
  }
}
```

Now, I am currently developing an npm package called [Serverless Testing Toolkit](https://www.npmjs.com/package/@andybalham/sls-testing-toolkit). This toolkit has a base [CDK Stack](https://docs.aws.amazon.com/cdk/latest/guide/stacks.html) that can extended to provide a hosting environment for the construct under test. I wrote about this approach in my series [Serverless integration testing with the AWS CDK](https://www.10printiamcool.com/series/integration-test-with-cdk). This testing approach relies on tagging resources, such as Lambda functions or SQS queues, so that they can be located and invoked. I hoped to use this approach to put events on an EventBridge event bus. The [AWS documentation](https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_TagResource.html) certainly gave me reason to believe.

> In EventBridge, rules and **event buses** can be tagged.

With this good news, I extended the `IntegrationTestStack` from the [Serverless Testing Toolkit](https://www.npmjs.com/package/@andybalham/sls-testing-toolkit) and tagged the `EventBus` exposed by our system under test (SUT).

```TypeScript
export default class NotificationHubTestStack extends IntegrationTestStack {
  //
  static readonly Id = `NotificationHubTestStack`;

  static readonly BusObserverFunctionId = 'BusObserverFunction';

  static readonly TestLenderId = 'test-lender-id';

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id, {
      testStackId: NotificationHubTestStack.Id,
      testFunctionIds: [NotificationHubTestStack.BusObserverFunctionId],
    });

    // SUT

    const sut = new NotificationHub(this, 'SUT');

    this.addTestResourceTag(sut.eventBus, NotificationHub.NotificationHubEventBusId);

    // Rule and target observer

    const testLenderRule = new events.Rule(this, 'SourceRule', {
      eventBus: sut.eventBus,
      eventPattern: {
        source: [`lender.${NotificationHubTestStack.TestLenderId}`],
      },
    });

    sourceRule.addTarget(
      new eventsTargets.LambdaFunction(
        this.testFunctions[NotificationHubTestStack.BusObserverFunctionId]
      )
    );
  }
}
```

Supplying one or more values for `testFunctionIds` causes the `IntegrationTestStack` base class to create Lambda functions. These functions record all events received as observations in a DynamoDB table (also created automatically). This table can then be queried to verify that the system is working as expected. 

My intention was to hook such a function up as the target for an EventBridge rule. To do this, I first created a `Rule` on the SUT event bus and specified a pattern based on a specific `source` value. I then added a `Target` to the rule, pointing a the test Lambda function created by `IntegrationTestStack`. If all goes to plan, the function should write the event 'as-is' to the DynamoDB table for verification. All that was left was to deploy the `Stack` and put some events on the bus. 

## Driving the event bus

Deploying the `Stack` proved straightforward. The problems started when I created a client class to put events on the bus. As mentioned earlier, for other types of resources I had used the [AWS Resource Groups Tagging API](https://docs.aws.amazon.com/resourcegroupstagging/latest/APIReference/overview.html) to locate resources by tags. However, when I tried the same approach with an event bus, there was no sign of it in the returned resources.

`¯\_(ツ)_/¯`

I looked at the event bus in the AWS console, but still no joy. It looks like currently (26 August 2021), there is no way to tag an event bus. This was a bit of a kick in the teeth, but I had a fall back plan. This involved using the `EventBridge` `listEventBuses` method, then using the pattern matching on the name to resolve to an [ARN](https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html) . This wouldn't be as robust as using tags, but would have to suffice until support was added for event bus tags.

Armed with the knowledge of how the ARN for an event bus, I extended the [Serverless Testing Toolkit](https://www.npmjs.com/package/@andybalham/sls-testing-toolkit) `IntegrationTestClient` class. I added a new `getEventBridgeTestClient` method that returned an `EventBridgeTestClient` for a given id. The implementation of `EventBridgeTestClient` can be seen below.

```TypeScript
export default class EventBridgeTestClient {

  readonly eventBridge: AWS.EventBridge;

  constructor(region: string, public eventBusArn: string) {
    this.eventBridge = new AWS.EventBridge({ region });
  }

  async putEventAsync(entry: PutEventsRequestEntry): Promise<PutEventsResponse> {
    const response = await this.putEventsAsync([entry]);
    return response;
  }

  async putEventsAsync(entries: PutEventsRequestEntry[]): Promise<PutEventsResponse> {

    const request: PutEventsRequest = {
      Entries: entries.map((e) => ({
        ...e,
        EventBusName: this.eventBusArn,
      })),
    };

    const response = await this.eventBridge.putEvents(request).promise();
    return response;
  }
}
```

I now had all the pieces in place to be able to write my test, but before that I needed to implement some setup. This setup involved creating a `IntegrationTestClient` instance for the test stack, initialising it, and using it to obtain an `EventBridgeTestClient` instance for interacting with the event bus. Before each test, there also needs to be a call to `initialiseTestAsync` to clear down results from previous tests.

```TypeScript
const testClient = new IntegrationTestClient({
  testStackId: NotificationHubTestStack.Id,
});

let notificationHubEventBus: EventBridgeTestClient;

before(async () => {
  await testClient.initialiseClientAsync();
  notificationHubEventBus = testClient.getEventBridgeTestClient(
    NotificationHub.NotificationHubEventBusId
  );
});

beforeEach(async () => {
  await testClient.initialiseTestAsync();
});
```

For the test, I used my extension of the Arrange, Act, Assert approach as described in the [Serverless integration testing with the AWS CDK](https://www.10printiamcool.com/series/integration-test-with-cdk) series. This involves an Await step that polls the observations recorded by test functions. In this case, the test simply had to look for one or more such observations and verify that the detail was as originally specified.

```TypeScript
it('handles events published directly to event bus', async () => {
  // Arrange

  const caseEvent: CaseStatusUpdatedEvent = {
    eventType: CaseEventType.CaseStatusUpdated,
    lenderId: NotificationHubTestStack.TestLenderId,
    caseId: 'C1234',
  };

  const eventRequest: PutEventsRequestEntry = {
    Source: `lender.${caseEvent.lenderId}`,
    DetailType: caseEvent.eventType,
    Detail: JSON.stringify(caseEvent),
  };

  // Act

  await notificationHubEventBus.putEventAsync(eventRequest);

  // Await

  const { observations, timedOut } = await testClient.pollTestAsync({
    until: async (o) => o.length > 0,
  });

  // Assert

  expect(timedOut, 'timedOut').to.be.false;

  const busEvent = observations[0].data;

  expect(busEvent.detail).to.deep.equal(caseEvent);
});
```

To my genuine surprise, the test passed first time. This doesn't make for much of an anecdote, but does show that EventBridge is quite straightforward. With the simple case up and running, my thoughts turned to testing more complicated event routing.

## Becoming an event bus route master

I decided to carry on with the test function approach and define some more rules on the event bus. First, I defined a pattern to match the `lenderId` value in the `detail` property.

```TypeScript
static readonly TestEventPattern = {
  source: ['test.event-pattern'],
};

static readonly EqualTestEventPattern = {
  ...NotificationHubTestStack.TestEventPattern,
  detail: {
    lenderId: 'LenderA',
  },
};
```

With the pattern defined, I added a rule and targeted the test function.

```TypeScript
this.addEventBridgeRuleTargetFunction(
  this.addEventBridgePatternRule(
    'EqualRule',
    sut.eventBus,
    NotificationHubTestStack.EqualTestEventPattern
  ),
  NotificationHubTestStack.BusObserverFunctionId,
  events.RuleTargetInput.fromText('EQUAL')
);
```

For convenience, I added a couple of methods to `IntegrationTestClient`, one to create a pattern-based rule and one to wire up a test function to observe the events. In order to differentiate the observed events, I hardcoded the data sent to the test function for the rule to be `EQUAL`.

All looked good until I tried to deploy.

```
0/3 |18:01:02 | UPDATE_FAILED        | AWS::Events::Rule       | EqualRule (EqualRuleA4D32458) Event pattern is not valid. Reason: "lenderId" must be an object or an array
at [Source: (String)"{"source":["test.event-pattern"],"detail":{"lenderId":"LenderA"}}"; line: 1, column: 56] (Service: AmazonCloudWatchEvents; Status Code: 400; Error Code: InvalidEventPatternException; Request ID: 7ec85bb1-59fe-421b-92d5-f8ed1827d4fc; Proxy: null)
```

I was impressed at the detail of the error message, clearly pinpointing the error of my ways. However, I felt it was a little late in the day to find out such an error. I would have rather caught such a thing earlier. Thankfully, it turns out there is a way to do this that I will go into later.

At the time, however, I amending the pattern as follows and that allowed the deployment to succeed.

```TypeScript
static readonly EqualTestEventPattern = {
  ...NotificationHubTestStack.TestEventPattern,
  detail: {
    lenderId: ['LenderA'], // <-- Array!
  },
};
```

With this in place, I created a unit test that followed the pattern of the previous unit test. In the test, I put through a set of events and asserted that the observations were as expected for each. I extended this to cover all the pattern options as described by the [AWS documentation](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html). The resulting test can be found in the [GitHub repo](https://github.com/andybalham/sls-testing-toolkit/blob/main/examples/notification-hub/NotificationHub.test.ts).

> One thing I noticed during this experimentation, was that it wasn't possible to do prefix matching on the `source` of an event. The recommendation is for a Java package style naming, e.g. `com.mycompany.myapp`, but you cannot match on all `com.mycompany` entries.

I was now fairly confident in using CDK to create `Rule` instances and then to wire them up to a Lambda function `Target`. I was not overly happy that it required a deployment to validate and test the pattern matching. However, I had noticed that both the [AWS SDK](https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_TestEventPattern.html) had a `testEventPattern` method that promised to do both without deployment.

## Early warning testing with `testEventPattern`

Consulting the documentation, the theory seemed simple enough. Pass in an event and an event pattern and `testEventPattern` would validate the pattern and return whether it matched. With this in mind, I created the following test.

```TypeScript
// Arrange

const caseEvent = {
  eventType: CaseEventType.CaseStatusUpdated,
  lenderId: 'LenderA',
  caseId: 'C1234',
},

const putEventsRequest: PutEventsRequestEntry = {
  Source: `test.event-pattern`,
  DetailType: caseEvent.eventType,
  Detail: JSON.stringify(caseEvent),
};

// Act

const testRequest: TestEventPatternRequest = {
  Event: JSON.stringify(putEventsRequest),
  EventPattern: JSON.stringify(NotificationHubTestStack.EqualTestEventPattern),
};

const isEqualMatch = (
  await IntegrationTestClient.eventBridge.testEventPattern(testRequest).promise()
).Result;

// Assert

expect(isEqualMatch).to.be.true;
```

However, when running the test, I got the following error:

```
ValidationException: Parameter Event is not valid.
```

Drilling into the documentation for `TestEventPatternRequest`, I found the following for `Event`:

> The event, in JSON format, to test against the event pattern. The JSON must follow the format specified in Amazon Web Services Events, and the following fields are mandatory: id, account, source, time, region, resources, detail-type   

So it seemed that `testEventPattern` requires a fully-formed event to work. At this point, I decided that I would create a method `isEventPatternMatchAsync` on `IntegrationTestClient` to encapsulate this:

```TypeScript
static async isEventPatternMatchAsync({
  eventPattern,
  putEventsRequest,
}: {
  eventPattern: cdkEvents.EventPattern;
  putEventsRequest: PutEventsRequestEntry;
}): Promise<boolean> {
  //
  const mappedEvent: any = {
    id: '6a7e8feb-b491-4cf7-a9f1-bf3703467718',
    'detail-type': putEventsRequest.DetailType ? putEventsRequest.DetailType : 'detail-type',
    source: putEventsRequest.Source ? putEventsRequest.Source : 'source',
    account: '0000000000',
    time: putEventsRequest.Time ? putEventsRequest.Time : '2017-12-22T18:43:48Z',
    region: 'us-west-1',
    resources: putEventsRequest.Resources ? putEventsRequest.Resources : [],
    detail: putEventsRequest.Detail ? JSON.parse(putEventsRequest.Detail) : undefined,
  };

  const request: TestEventPatternRequest = {
    Event: JSON.stringify(mappedEvent),
    EventPattern: JSON.stringify(eventPattern),
  };

  const response = await this.eventBridge.testEventPattern(request).promise();

  return response.Result ?? false;
}
```

I re-ran the tests and got a number of failures. All the failed tests involved matching on the detail type. After comparing the deployed patterns with the JSON for the CDK patterns, I noticed that the deployed patterns had `detail-type` as a property. With this in mind, I amended the `isEventPatternMatchAsync` method to map the event pattern as follows.

```TypeScript
const mappedEventPattern = {
  ...eventPattern,
  'detail-type': eventPattern.detailType,
  detailType: undefined,
};

const request: TestEventPatternRequest = {
  Event: JSON.stringify(mappedEvent),
  EventPattern: JSON.stringify(mappedEventPattern),
};
```

This did the trick. Now I had a way of validating and testing event patterns before deployment and then using the exact same patterns in my CDK constructs. For future projects, this should make development much easier. The resulting test can be found in the [GitHub repo](https://github.com/andybalham/sls-testing-toolkit/blob/main/examples/notification-hub/NotificationHubPattern.test.ts).

## Conclusion

I found EventBridge fairly straightforward to use, certainly within the limitations of my experiment. There were some oddities, such as no tags and differing structures, but on the whole I found it nice to use.

If you want, please check out my [Serverless Testing Toolkit](https://www.npmjs.com/package/@andybalham/sls-testing-toolkit). You can either use it as a package, or you can take whatever code you like from the repo. All feedback is welcomed.