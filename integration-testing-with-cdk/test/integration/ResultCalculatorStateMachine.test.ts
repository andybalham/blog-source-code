import { expect } from 'chai';
import { nanoid } from 'nanoid';
import { UnitTestClient } from '../../src/aws-integration-test';
import { ResultCalculatorStateMachineTestStack as TestStack } from '../../src/cdk/stacks/test';
import { FileEvent, FileEventType, FileHeaderIndex, FileType } from '../../src/contracts';
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

    const fileEvent = new FileEvent(
      FileEventType.Created,
      FileSectionType.Body,
      `s3Key:${nanoid()}`
    );

    const unhandledFileHeader = { fileType: FileType.Result, name: `name:${nanoid()}` };

    await testClient.initialiseTestAsync({
      testId: 'Unhandled file type',
      mocks: {
        [TestStack.FileHeaderReaderMockId]: [{ response: unhandledFileHeader }],
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

  it('New scenario created', async () => {
    //
    // Arrange

    const scenarioFileEvent = new FileEvent(
      FileEventType.Created,
      FileSectionType.Body,
      `ScenarioS3Key:${nanoid()}`
    );

    const scenarioFileHeader = { fileType: FileType.Scenario, name: `ScenarioName:${nanoid()}` };

    const scenarioFileHeaderIndex: FileHeaderIndex = {
      s3Key: scenarioFileEvent.s3Key,
      header: scenarioFileHeader,
    };

    const newConfigurationFileHeaderIndex = (): FileHeaderIndex => ({
      s3Key: `ConfigurationS3Key${nanoid()}`,
      header: { fileType: FileType.Configuration, name: `ConfigurationName:${nanoid()}` },
    });

    const configurationCount = 6;

    const configurationFileHeaderIndexes = [...Array(configurationCount).keys()]
      .map(() => newConfigurationFileHeaderIndex())
      .map((c) => ({
        configurationS3Key: c.s3Key,
        scenarioS3Key: scenarioFileHeaderIndex.s3Key,
      }));

    const combinedHeaders = configurationFileHeaderIndexes.map((c) => ({
      configuration: c,
      scenario: scenarioFileHeaderIndex,
    }));

    await testClient.initialiseTestAsync({
      testId: 'New scenario created',
      mocks: {
        [TestStack.FileHeaderReaderMockId]: [{ response: scenarioFileHeader }],
        [TestStack.FileHeaderIndexReaderMockId]: [{ response: configurationFileHeaderIndexes }],
        [TestStack.CombineHeadersMockId]: [{ response: combinedHeaders }],
      },
    });

    const sutClient = testClient.getStepFunctionClient(TestStack.StateMachineId);

    // Act

    await sutClient.startExecutionAsync({ fileEvent: scenarioFileEvent });

    // Await

    const { timedOut, outputs } = await testClient.pollOutputsAsync({
      until: async () => sutClient.isExecutionFinishedAsync(),
      intervalSeconds: 2,
      timeoutSeconds: 12,
    });

    // Assert

    expect(timedOut, 'Timed out').to.equal(false);

    const status = await sutClient.getStatusAsync();

    expect(status).to.equal('SUCCEEDED');

    expect(outputs.length).to.equal(configurationCount);
  });
});
