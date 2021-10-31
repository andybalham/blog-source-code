/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import {
  IntegrationTestClient,
  SNSTestClient,
  TestObservation,
} from '@andybalham/sls-testing-toolkit';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { DateTime } from 'luxon';
import PriorityRouterTestStack from '../lib/PriorityRouterTestStack';

describe('PriorityRouter Test Suite', () => {
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

  [
    { deadline: undefined, isExpectedHigh: false },
    {
      deadline: {
        DataType: 'String',
        StringValue: '<invalid>',
      },
      isExpectedHigh: false,
    },
    {
      deadline: {
        DataType: 'String',
        StringValue: DateTime.now()
          .minus({
            days: PriorityRouterTestStack.HighPriorityThresholdDays + 1,
          })
          .toISO(),
      },
      isExpectedHigh: false,
    },
    {
      deadline: {
        DataType: 'String',
        StringValue: DateTime.now()
          .minus({
            days: PriorityRouterTestStack.HighPriorityThresholdDays - 1,
          })
          .toISO(),
      },
      isExpectedHigh: true,
    },
  ].forEach((theory) => {
    it.only(`Routes as expected: ${JSON.stringify(theory)}`, async () => {
      // Arrange

      const testEvent = {
        stringValue: 'stringValue',
        numberValue: 616,
      };

      const eventAttributes = theory.deadline ? { Deadline: theory.deadline } : undefined;

      // Act

      await testInputTopic.publishEventAsync(testEvent, eventAttributes);

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

      let events: SQSRecord[];

      if (theory.isExpectedHigh) {
        expect(highPriorityObservations.length).to.be.greaterThan(0);
        expect(normalPriorityObservations.length).to.equal(0);
        events = TestObservation.getEventRecords<SQSEvent, SQSRecord>(highPriorityObservations);
      } else {
        expect(normalPriorityObservations.length).to.be.greaterThan(0);
        expect(highPriorityObservations.length).to.equal(0);
        events = TestObservation.getEventRecords<SQSEvent, SQSRecord>(normalPriorityObservations);
      }

      const firstMessageBody = JSON.parse(events[0].body);
      expect(firstMessageBody).to.deep.equal(testEvent);
    });
  });
});
