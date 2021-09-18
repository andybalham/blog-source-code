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
import EmptyOrchestrationTestStack from './EmptyOrchestrationTestStack';

describe('Empty orchestration tests', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: EmptyOrchestrationTestStack.Id,
    deleteLogs: true,
  });

  let sut: LambdaTestClient;

  before(async () => {
    await testClient.initialiseClientAsync();
    sut = testClient.getLambdaTestClient(EmptyOrchestrationTestStack.OrchestrationHandlerId);
  });

  it('returns unknown status', async () => {
    // Arrange

    // Act

    const response = await sut.invokeAsync<ListExecutionRequest, ListExecutionResponse>({
      isListExecutionResponse: null,
      executionId: 'unknown',
    });

    // Assert

    console.log(JSON.stringify({ response }, null, 2));

    expect(response?.status).to.be.undefined;
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

    const response = await sut.invokeAsync<ListExecutionRequest, ListExecutionResponse>({
      isListExecutionResponse: null,
      executionId,
    });

    console.log(JSON.stringify({ response }, null, 2));

    expect(timedOut, 'timedOut').to.be.false;
  });
});
