/* eslint-disable @typescript-eslint/no-unused-expressions */
// import { SNSEvent } from 'aws-lambda';
import { expect } from 'chai';
import {
  // TestObservation,
  IntegrationTestClient,
  SNSTestClient,
  TestObservation,
} from '@andybalham/sls-testing-toolkit';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import PriorityRouterTestStack from '../lib/PriorityRouterTestStack';

describe('SimpleEventRouter Test Suite', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: PriorityRouterTestStack.StackId,
    deleteLogs: true,
  });

  let testInputTopic: SNSTestClient;

  before(async () => {
    await testClient.initialiseClientAsync();
    testInputTopic = testClient.getSNSTestClient(PriorityRouterTestStack.TestInputTopicId);
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
  });

  it.only(`Routes no deadline as normal`, async () => {
    // Arrange

    const testEvent = {
      stringValue: 'stringValue',
      numberValue: 616,
    };

    // Act

    await testInputTopic.publishEventAsync(testEvent);

    // Await

    const { observations, timedOut } = await testClient.pollTestAsync({
      until: async (o) => o.length > 0,
      intervalSeconds: 2,
      timeoutSeconds: 12,
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;

    const highPriorityObservations = TestObservation.filterById(
      observations,
      PriorityRouterTestStack.HighPriorityConsumerId
    );

    const normalPriorityObservations = TestObservation.filterById(
      observations,
      PriorityRouterTestStack.NormalPriorityConsumerId
    );

    expect(normalPriorityObservations.length).to.be.greaterThan(0);
    expect(highPriorityObservations.length).to.equal(0);

    const events = TestObservation.getEventRecords<SQSEvent, SQSRecord>(normalPriorityObservations);

    const firstMessageBody = JSON.parse(events[0].body);

    expect(firstMessageBody).to.deep.equal(testEvent);
  });

  [
    { values: [], isExpectedPositive: true },
    { values: [1, 2, 3], isExpectedPositive: true },
    { values: [1, 2, -3], isExpectedPositive: true },
    { values: [1, -2, -3], isExpectedPositive: false },
  ].forEach((theory) => {
    it(`Routes as expected: ${JSON.stringify(theory)}`, async () => {
      // Arrange

      const testEvent = {
        values: theory.values,
      };

      // Act

      await testInputTopic.publishEventAsync(testEvent);

      // Await

      const { observations, timedOut } = await testClient.pollTestAsync({
        until: async (o) => o.length > 0,
        intervalSeconds: 2,
        timeoutSeconds: 12,
      });

      // Assert

      expect(timedOut, 'timedOut').to.be.false;

      expect(observations.length).to.equal(1);

      // const positiveObservations = TestObservation.filterById(
      //   observations,
      //   SimpleEventRouterTestStack.PositiveOutputTopicSubscriberId
      // );

      // const negativeObservations = TestObservation.filterById(
      //   observations,
      //   SimpleEventRouterTestStack.NegativeOutputTopicSubscriberId
      // );

      // if (theory.isExpectedPositive) {
      //   //
      //   expect(positiveObservations.length).to.be.greaterThan(0);
      //   expect(negativeObservations.length).to.equal(0);

      //   const routedEvent = JSON.parse(
      //     (positiveObservations[0].data as SNSEvent).Records[0].Sns.Message
      //   );
      //   expect(routedEvent).to.deep.equal(testEvent);
      //   //
      // } else {
      //   //
      //   expect(positiveObservations.length).to.equal(0);
      //   expect(negativeObservations.length).to.be.greaterThan(0);

      //   const routedEvent = JSON.parse(
      //     (negativeObservations[0].data as SNSEvent).Records[0].Sns.Message
      //   );
      //   expect(routedEvent).to.deep.equal(testEvent);
      // }
    });
  });
});
