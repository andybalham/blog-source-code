/* eslint-disable @typescript-eslint/no-unused-expressions */
import {
  IntegrationTestClient,
  LambdaTestClient,
  TestObservation,
} from '@andybalham/sls-testing-toolkit';
import { SNSEvent, SNSEventRecord } from 'aws-lambda/trigger/sns';
import { expect } from 'chai';
import {
  ExecutionStatus,
  ListExecutionRequest,
  ListExecutionResponse,
  StartExecutionRequest,
  StartExecutionResponse,
} from '../../src';
import { SimpleBranchingInput } from './SimpleBranching.SimpleBranchingHandler';
import SimpleBranchingTestStack from './SimpleBranchingTestStack';

describe('Simple sequence tests', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: SimpleBranchingTestStack.Id,
    deleteLogs: true,
  });

  let sut: LambdaTestClient;

  before(async () => {
    await testClient.initialiseClientAsync();
    sut = testClient.getLambdaTestClient(SimpleBranchingTestStack.OrchestrationHandlerId);
  });

  [
    {
      input: {
        operationText: 'add',
        x: 1,
        y: 2,
      },
      expectedResultMessage: 'Added 1 to 2 and got 3',
    },
    {
      input: {
        operationText: '+',
        x: 1,
        y: 2,
      },
      expectedResultMessage: 'Added 1 to 2 and got 3',
    },
    {
      input: {
        operationText: 'plus',
        x: 1,
        y: 2,
      },
      expectedResultMessage: 'Added 1 to 2 and got 3',
    },
    {
      input: {
        operationText: 'subtract',
        x: 3,
        y: 2,
      },
      expectedResultMessage: 'Subtracted 2 from 3 and got 1',
    },
    {
      input: {
        operationText: '-',
        x: 3,
        y: 2,
      },
      expectedResultMessage: 'Subtracted 2 from 3 and got 1',
    },
    {
      input: {
        operationText: 'minus',
        x: 3,
        y: 2,
      },
      expectedResultMessage: 'Subtracted 2 from 3 and got 1',
    },
  ].forEach((theory) => {
    it(`returns expected message ${JSON.stringify(theory)}`, async () => {
      // Arrange

      await testClient.initialiseTestAsync();

      // const input: SimpleBranchingInput = {
      //   operationText: 'plus',
      //   x: 1,
      //   y: 2,
      // };

      // const expectedResultMessage = 'Added 1 to 2 and got 3';

      // Act

      const startExecutionResponse = await sut.invokeAsync<
        StartExecutionRequest,
        StartExecutionResponse
      >({
        isStartExecutionResponse: null,
        input: theory.input,
      });

      if (startExecutionResponse === undefined)
        throw new Error('startExecutionResponse === undefined');

      const { executionId } = startExecutionResponse;

      // Await

      const { observations, timedOut } = await testClient.pollTestAsync({
        until: async (o) => o.length > 0,
      });

      // Assert

      expect(timedOut, 'timedOut').to.be.false;

      const listExecutionResponse = await sut.invokeAsync<
        ListExecutionRequest,
        ListExecutionResponse
      >({
        isListExecutionResponse: null,
        executionId,
      });

      expect(listExecutionResponse?.status).to.equal(ExecutionStatus.Succeeded);
      expect(listExecutionResponse?.output).to.be.undefined;

      const records = TestObservation.getEventRecords<SNSEvent, SNSEventRecord>(observations);

      expect(records.length).to.equal(1);

      const firstSnsMessage = records[0].Sns.Message;
      expect(firstSnsMessage).to.equal(theory.expectedResultMessage);
    });
  });

  it(`fails on unknown operation`, async () => {
    // Arrange

    await testClient.initialiseTestAsync();

    const input: SimpleBranchingInput = {
      operationText: 'unknown',
      x: 1,
      y: 2,
    };

    // Act

    const startExecutionResponse = await sut.invokeAsync<
      StartExecutionRequest,
      StartExecutionResponse
    >({
      isStartExecutionResponse: null,
      input,
    });

    if (startExecutionResponse === undefined)
      throw new Error('startExecutionResponse === undefined');

    const { executionId } = startExecutionResponse;

    // Await

    const { timedOut } = await testClient.pollTestAsync({
      until: async () =>
        (
          await sut.invokeAsync<ListExecutionRequest, ListExecutionResponse>({
            isListExecutionResponse: null,
            executionId,
          })
        )?.status === ExecutionStatus.Failed,
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;
  });
});
