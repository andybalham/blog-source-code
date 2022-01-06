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

  let testApplicationEventTopicId: SNSTestClient;

  before(async () => {
    await testClient.initialiseClientAsync();
    testApplicationEventTopicId = testClient.getSNSTestClient(
      ApplicationCreatedFilterTestStack.ApplicationEventTopicId
    );
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
  });

  [
    {
      loanAmount: 1000000,
      postcode: 'XXX',
      expectedHighValueCount: 1,
      expectedPostcodeFilterCount: 0,
    },
  ].forEach((theory) => {
    it.only(`Routes as expected: ${JSON.stringify(theory)}`, async () => {
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

      await testApplicationEventTopicId.publishEventAsync(testEvent, eventAttributes);

      // Await

      const { timedOut } = await testClient.pollTestAsync({
        until: async (o) =>
          TestObservation.filterById(o, ApplicationCreatedFilterTestStack.HighValueConsumerId)
            .length === theory.expectedHighValueCount &&
          TestObservation.filterById(o, ApplicationCreatedFilterTestStack.PostcodeFilterConsumerId)
            .length === theory.expectedPostcodeFilterCount,
      });

      // Assert

      expect(timedOut, 'timedOut').to.be.false;
      //
    }).timeout(30 * 1000);
  });
});
