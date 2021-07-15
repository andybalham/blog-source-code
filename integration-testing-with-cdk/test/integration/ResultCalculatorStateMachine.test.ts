import { expect } from 'chai';
import { nanoid } from 'nanoid';
import { UnitTestClient } from '../../src/aws-integration-test';
import { ResultCalculatorStateMachineTestStack as TestStack } from '../../src/cdk/stacks/test';
import {
  FileEvent,
  FileEventType,
  FileHeader,
  FileHeaderIndex,
  FileType,
} from '../../src/contracts';
import { FileSectionType } from '../../src/contracts/FileSectionType';

describe('ResultCalculatorStateMachine Tests', () => {
  const testClient = new UnitTestClient({
    testResourceTagKey: TestStack.ResourceTagKey,
  });

  before(async () => {
    await testClient.initialiseClientAsync();
  });

  beforeEach(async () => {
    // TODO 08Jul21: Clear down test bucket and underlying table?
  });

  it('Unhandled file type', async () => {
    //
    // Arrange
    const resultS3Key = `s3Key:${nanoid()}`;

    const fileEvent = new FileEvent(FileEventType.Created, FileSectionType.Body, resultS3Key);

    const unhandledFileHeaderIndex: FileHeaderIndex = {
      s3Key: resultS3Key,
      header: { fileType: FileType.Result, name: `name:${nanoid()}` },
    };

    await testClient.initialiseTestAsync('Unhandled file type', {
      mocks: {
        [TestStack.FileHeaderReaderMockId]: [{ response: unhandledFileHeaderIndex }],
      },
    });

    const sutClient = testClient.getStepFunctionClient(TestStack.StateMachineId);

    // Act

    await sutClient.startExecutionAsync({ fileEvent });

    // Await

    const { timedOut } = await testClient.pollOutputsAsync({
      until: async () => sutClient.isExecutionFinishedAsync(),
      intervalSeconds: 2,
      timeoutSeconds: 6,
    });

    // Assert

    expect(timedOut, 'Timed out').to.equal(false);

    const status = await sutClient.getStatusAsync();

    expect(status).to.equal('FAILED');

    const lastEvent = await sutClient.getLastEventAsync();

    expect(lastEvent).to.not.equal(undefined);
    expect(lastEvent?.executionFailedEventDetails?.cause).to.equal('Unhandled FileType');
  });

  it.only('New scenario created', async () => {
    //
    // Arrange

    const scenarioS3Key = `ScenarioS3Key:${nanoid()}`;

    const scenarioFileEvent = new FileEvent(
      FileEventType.Created,
      FileSectionType.Body,
      scenarioS3Key
    );

    const scenarioFileHeaderIndex: FileHeaderIndex = {
      s3Key: scenarioS3Key,
      header: { fileType: FileType.Scenario, name: `ScenarioName:${nanoid()}` },
    };

    const configurationFileHeaderIndexes: FileHeaderIndex[] = [
      {
        s3Key: `ConfigurationS3Key${nanoid()}`,
        header: { fileType: FileType.Configuration, name: `ConfigurationName:${nanoid()}` },
      },
      {
        s3Key: `ConfigurationS3Key${nanoid()}`,
        header: { fileType: FileType.Configuration, name: `ConfigurationName:${nanoid()}` },
      },
    ];

    const combinedResponse = configurationFileHeaderIndexes.map((c) => ({
      configuration: c,
      scenario: scenarioFileHeaderIndex,
    }));

    await testClient.initialiseTestAsync('New scenario created', {
      mocks: {
        [TestStack.FileHeaderReaderMockId]: [
          { response: scenarioFileHeaderIndex },
          { response: configurationFileHeaderIndexes },
        ],
        [TestStack.CombineHeadersMockId]: [{ response: combinedResponse }],
      },
    });

    const sutClient = testClient.getStepFunctionClient(TestStack.StateMachineId);

    // Act

    await sutClient.startExecutionAsync({ fileEvent: scenarioFileEvent });

    // Await

    const { timedOut } = await testClient.pollOutputsAsync({
      until: async () => sutClient.isExecutionFinishedAsync(),
      intervalSeconds: 2,
      timeoutSeconds: 6,
    });

    // Assert

    expect(timedOut, 'Timed out').to.equal(false);

    const status = await sutClient.getStatusAsync();

    expect(status).to.equal('SUCCEEDED');

    const lastEvent = await sutClient.getLastEventAsync();

    expect(lastEvent).to.not.equal(undefined);
    // expect(lastEvent?.executionFailedEventDetails?.cause).to.equal('Unhandled FileType');
  });
});
