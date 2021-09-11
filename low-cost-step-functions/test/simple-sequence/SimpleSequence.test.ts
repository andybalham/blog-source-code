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
import SimpleSequenceTestStack from './SimpleSequenceTestStack';

describe('Empty orchestration tests', () => {
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

  it('returns completed status', async () => {
    // Arrange

    // Act

    const startExecutionResponse = await sut.invokeAsync<
      StartExecutionRequest,
      StartExecutionResponse
    >({
      isStartExecutionResponse: null,
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
  });
});
