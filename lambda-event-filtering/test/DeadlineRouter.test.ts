/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import {
  IntegrationTestClient,
  SNSTestClient,
  TestObservation,
} from '@andybalham/sls-testing-toolkit';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { DateTime } from 'luxon';
import DeadlineRouterTestStack from '../lib/DeadlineRouterTestStack';

describe('DeadlineRouter Test Suite', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: DeadlineRouterTestStack.StackId,
    deleteLogs: true,
  });

  let testInputTopic: SNSTestClient;

  before(async () => {
    await testClient.initialiseClientAsync();
    testInputTopic = testClient.getSNSTestClient(DeadlineRouterTestStack.TestInputTopicId);
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
  });

  [
    { deadline: undefined, isExpectedHigh: false },
    {
      deadline: '<invalid>',
      isExpectedHigh: false,
    },
    {
      deadline: DateTime.now()
        .minus({
          days: DeadlineRouterTestStack.HighPriorityThresholdDays + 1,
        })
        .toISO(),
      isExpectedHigh: false,
    },
    {
      deadline: DateTime.now()
        .minus({
          days: DeadlineRouterTestStack.HighPriorityThresholdDays - 1,
        })
        .toISO(),
      isExpectedHigh: true,
    },
  ].forEach((theory) => {
    it.only(`Routes as expected: ${JSON.stringify(theory)}`, async () => {
      // Arrange

      const testEvent = {
        stringValue: 'stringValue',
        numberValue: 616,
      };

      const eventAttributes = theory.deadline
        ? { Deadline: { DataType: 'String', StringValue: theory.deadline } }
        : undefined;

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
        DeadlineRouterTestStack.HighPriorityConsumerId
      );

      const normalPriorityObservations = TestObservation.filterById(
        observations,
        DeadlineRouterTestStack.NormalPriorityConsumerId
      );

      const notExpectedObservations = theory.isExpectedHigh
        ? normalPriorityObservations
        : highPriorityObservations;

      const expectedObservations = theory.isExpectedHigh
        ? highPriorityObservations
        : normalPriorityObservations;

      expect(notExpectedObservations.length).to.equal(0);

      expect(expectedObservations.length).to.be.greaterThan(0);
      const events = TestObservation.getEventRecords<SQSEvent, SQSRecord>(expectedObservations);

      const firstMessageBody = JSON.parse(events[0].body);
      expect(firstMessageBody).to.deep.equal(testEvent);
      //
    }).timeout(30 * 1000);
  });
});
