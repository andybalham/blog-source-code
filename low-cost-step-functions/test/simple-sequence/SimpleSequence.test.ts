/* eslint-disable @typescript-eslint/no-unused-expressions */
import { IntegrationTestClient, LambdaTestClient } from '@andybalham/sls-testing-toolkit';
import { expect } from 'chai';
import {
  ExecutionStatus,
  ListExecutionRequest,
  ListExecutionResponse,
  StartExecutionRequest,
  StartExecutionResponse,
} from '../../src';
import { SimpleSequenceInput, SimpleSequenceOutput } from './SimpleSequence.handler';
import SimpleSequenceTestStack from './SimpleSequenceTestStack';

describe('Simple sequence tests', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: SimpleSequenceTestStack.Id,
    deleteLogs: true,
  });

  let sut: LambdaTestClient;

  before(async () => {
    await testClient.initialiseClientAsync();
    sut = testClient.getLambdaTestClient(SimpleSequenceTestStack.OrchestrationHandlerId);
  });

  it('returns expected total', async () => {
    // Arrange

    const input: SimpleSequenceInput = {
      x: 1,
      y: 2,
      z: 3,
    };

    const expectedOutput: SimpleSequenceOutput = {
      total: 6,
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
        )?.status === ExecutionStatus.Completed,
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

    expect(listExecutionResponse?.output).to.deep.equal(expectedOutput);
  });
});
