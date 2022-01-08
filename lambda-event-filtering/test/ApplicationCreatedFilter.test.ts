/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import {
  IntegrationTestClient,
  SNSTestClient,
  TestObservation,
} from '@andybalham/sls-testing-toolkit';
import ApplicationCreatedFilterTestStack from '../lib/ApplicationCreatedFilterTestStack';
import { ApplicationCreatedEvent } from '../src/ApplicationEvents';

describe('ApplicationCreatedFilter Test Suite', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: ApplicationCreatedFilterTestStack.StackId,
    deleteLogs: true,
  });

  let testApplicationEventTopic: SNSTestClient;

  before(async () => {
    await testClient.initialiseClientAsync();
    testApplicationEventTopic = testClient.getSNSTestClient(
      ApplicationCreatedFilterTestStack.ApplicationEventTopicId
    );
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
  });

  [
    {
      loanAmount: 500001,
      postcode: 'XX1 1XX',
      expectedHighValueCount: 1,
      expectedPostcodeCount: 0,
    },
    {
      loanAmount: 500000,
      postcode: 'MK7 2KE',
      expectedHighValueCount: 0,
      expectedPostcodeCount: 1,
    },
    {
      loanAmount: 500000,
      postcode: 'PR6 4JE',
      expectedHighValueCount: 0,
      expectedPostcodeCount: 1,
    },
    {
      loanAmount: 500001,
      postcode: 'PR6 4JE',
      expectedHighValueCount: 1,
      expectedPostcodeCount: 1,
    },
  ].forEach((theory) => {
    it(`Routes as expected: ${JSON.stringify(theory)}`, async () => {
      // Arrange

      const testEvent: ApplicationCreatedEvent = {
        eventType: 'Created',
        loanAmount: theory.loanAmount,
        postcode: theory.postcode,
        applicationId: '21546845',
      };

      const eventAttributes = {
        eventType: { DataType: 'String', StringValue: testEvent.eventType },
      };

      // Act

      await testApplicationEventTopic.publishEventAsync(testEvent, eventAttributes);

      // Await

      const { timedOut } = await testClient.pollTestAsync({
        until: async (o) =>
          TestObservation.filterById(o, ApplicationCreatedFilterTestStack.HighValueConsumerId)
            .length === theory.expectedHighValueCount &&
          TestObservation.filterById(o, ApplicationCreatedFilterTestStack.PostcodeConsumerId)
            .length === theory.expectedPostcodeCount,
      });

      // Assert

      expect(timedOut, 'timedOut').to.be.false;
      //
    }).timeout(30 * 1000);
  });

  it(`Filters out 'Updated' events`, async () => {
    // Arrange

    const testEvent: ApplicationCreatedEvent = {
      eventType: 'Updated',
      loanAmount: 1000000,
      postcode: 'MK4 9GD',
      applicationId: '21546845',
    };

    const eventAttributes = {
      eventType: { DataType: 'String', StringValue: testEvent.eventType },
    };

    // Act

    await testApplicationEventTopic.publishEventAsync(testEvent, eventAttributes);

    // Await

    const { timedOut } = await testClient.pollTestAsync({
      until: async (o) => o.length > 0,
      timeoutSeconds: 6,
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.true;
    //
  }).timeout(30 * 1000);
});
