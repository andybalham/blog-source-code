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
import { SimpleBranchingInput } from './SimpleBranching.handler';
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

  it('returns expected total', async () => {
    // Arrange

    const input: SimpleBranchingInput = {
      operationText: 'plus',
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
        )?.status === ExecutionStatus.Succeeded,
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

    expect(listExecutionResponse?.output).to.be.undefined;
  });
});
