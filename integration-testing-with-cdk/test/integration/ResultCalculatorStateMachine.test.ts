import { SNSEvent } from 'aws-lambda';
import { expect } from 'chai';
import { nanoid } from 'nanoid';
import { ObserverOutput, UnitTestClient } from '../../src/aws-integration-test';
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

    const getErrorOutputs = (outputs: ObserverOutput<any>[]): ObserverOutput<any>[] =>
      outputs.filter((o) => o.observerId === TestStack.ErrorTopicObserverId);

    const { outputs, timedOut } = await testClient.pollOutputsAsync<ObserverOutput<any>>({
      until: async (o) => sutClient.isExecutionFinishedAsync() && getErrorOutputs(o).length > 0,
      intervalSeconds: 2,
      timeoutSeconds: 12,
    });

    // Assert

    expect(timedOut, 'Timed out').to.equal(false);

    const status = await sutClient.getStatusAsync();

    expect(status).to.equal('FAILED');

    const lastEvent = await sutClient.getLastEventAsync();

    expect(lastEvent).to.not.equal(undefined);
    expect(lastEvent?.executionFailedEventDetails?.cause).to.equal('Unhandled FileType');

    const errorEventRecords = getErrorOutputs(outputs)
      .map((o) => (o.event as SNSEvent).Records)
      .reduce((all, r) => all.concat(r), []);

    const errorEvent = JSON.parse(errorEventRecords[0].Sns.Message);

    expect(errorEvent.error).to.equal('Unhandled FileType');
    expect(errorEvent.fileEvent).to.not.equal(undefined);
    expect(errorEvent.fileHeader).to.not.equal(undefined);
  });

  it('New scenario created', async () => {
    // Arrange

    const fileEvent = new FileEvent(
      FileEventType.Created,
      FileSectionType.Body,
      `ScenarioS3Key:${nanoid()}`
    );

    const scenarioFileHeader = { fileType: FileType.Scenario, name: `ScenarioName:${nanoid()}` };

    const scenarioFileHeaderIndex: FileHeaderIndex = {
      s3Key: fileEvent.s3Key,
      header: scenarioFileHeader,
    };

    const newConfigurationFileHeaderIndex = (): FileHeaderIndex => ({
      s3Key: `ConfigurationS3Key:${nanoid()}`,
      header: { fileType: FileType.Configuration, name: `ConfigurationName:${nanoid()}` },
    });

    const configurationCount = 6;

    const configurationFileHeaderIndexes = [...Array(configurationCount).keys()].map(() =>
      newConfigurationFileHeaderIndex()
    );

    const combinedHeaders = configurationFileHeaderIndexes.map((c) => ({
      configurationS3Key: c.s3Key,
      scenarioS3Key: scenarioFileHeaderIndex.s3Key,
    }));

    await testClient.initialiseTestAsync({
      testId: 'New scenario created',
      mocks: {
        [TestStack.FileHeaderReaderMockId]: [
          { assert: { requiredProperties: ['s3Key'] }, response: scenarioFileHeader },
        ],
        [TestStack.FileHeaderIndexReaderMockId]: [
          {
            assert: { requiredProperties: ['fileType'] },
            response: configurationFileHeaderIndexes,
          },
        ],
        [TestStack.CombineHeadersMockId]: [
          { assert: { requiredProperties: ['configurations'] }, response: combinedHeaders },
        ],
      },
    });

    const sutClient = testClient.getStepFunctionClient(TestStack.StateMachineId);

    // Act

    await sutClient.startExecutionAsync({ fileEvent });

    // Await

    const { timedOut, outputs } = await testClient.pollOutputsAsync<ObserverOutput<any>>({
      until: async () => sutClient.isExecutionFinishedAsync(),
      intervalSeconds: 2,
      timeoutSeconds: 12,
    });

    // Assert

    expect(timedOut, 'Timed out').to.equal(false);

    const status = await sutClient.getStatusAsync();

    expect(status).to.equal('SUCCEEDED');

    const resultCalculatorOutputs = outputs.filter(
      (o) => o.observerId === TestStack.ResultCalculatorObserverId
    );

    expect(resultCalculatorOutputs.length).to.equal(configurationCount);
  });

  it('New configuration created', async () => {
    // Arrange

    const configurationFileEvent = new FileEvent(
      FileEventType.Created,
      FileSectionType.Body,
      `ConfigurationS3Key:${nanoid()}`
    );

    const configurationFileHeader = {
      fileType: FileType.Configuration,
      name: `ConfigurationName:${nanoid()}`,
    };

    const configurationFileHeaderIndex: FileHeaderIndex = {
      s3Key: configurationFileEvent.s3Key,
      header: configurationFileHeader,
    };

    const newScenarioFileHeaderIndex = (): FileHeaderIndex => ({
      s3Key: `ScenarioS3Key:${nanoid()}`,
      header: { fileType: FileType.Scenario, name: `ScenarioName:${nanoid()}` },
    });

    const scenarioCount = 6;

    const scenarioFileHeaderIndexes = [...Array(scenarioCount).keys()].map(() =>
      newScenarioFileHeaderIndex()
    );

    const combinedHeaders = scenarioFileHeaderIndexes.map((s) => ({
      configurationS3Key: configurationFileHeaderIndex.s3Key,
      scenarioS3Key: s.s3Key,
    }));

    await testClient.initialiseTestAsync({
      testId: 'New configuration created',
      mocks: {
        [TestStack.FileHeaderReaderMockId]: [
          { assert: { requiredProperties: ['s3Key'] }, response: configurationFileHeader },
        ],
        [TestStack.FileHeaderIndexReaderMockId]: [
          {
            assert: { requiredProperties: ['fileType'] },
            response: scenarioFileHeaderIndexes,
          },
        ],
        [TestStack.CombineHeadersMockId]: [
          { assert: { requiredProperties: ['scenarios'] }, response: combinedHeaders },
        ],
      },
    });

    const sutClient = testClient.getStepFunctionClient(TestStack.StateMachineId);

    // Act

    await sutClient.startExecutionAsync({ fileEvent: configurationFileEvent });

    // Await

    const { timedOut, outputs } = await testClient.pollOutputsAsync<ObserverOutput<any>>({
      until: async () => sutClient.isExecutionFinishedAsync(),
      intervalSeconds: 2,
      timeoutSeconds: 12,
    });

    // Assert

    expect(timedOut, 'Timed out').to.equal(false);

    const status = await sutClient.getStatusAsync();

    expect(status).to.equal('SUCCEEDED');

    const resultCalculatorOutputs = outputs.filter(
      (o) => o.observerId === TestStack.ResultCalculatorObserverId
    );

    expect(resultCalculatorOutputs.length).to.equal(scenarioCount);
  });

  it('File reader retries and succeeds', async () => {
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
      testId: 'File reader retries and succeeds',
      mocks: {
        [TestStack.FileHeaderReaderMockId]: [
          { error: 'Test error 1' },
          { error: 'Test error 2' },
          { response: scenarioFileHeader },
        ],
        [TestStack.FileHeaderIndexReaderMockId]: [{ response: configurationFileHeaderIndexes }],
        [TestStack.CombineHeadersMockId]: [{ response: combinedHeaders }],
      },
    });

    const sutClient = testClient.getStepFunctionClient(TestStack.StateMachineId);

    // Act

    await sutClient.startExecutionAsync({ fileEvent: scenarioFileEvent });

    // Await

    const { timedOut, outputs } = await testClient.pollOutputsAsync<ObserverOutput<any>>({
      until: async () => sutClient.isExecutionFinishedAsync(),
      intervalSeconds: 2,
      timeoutSeconds: 24,
    });

    // Assert

    expect(timedOut, 'Timed out').to.equal(false);

    const status = await sutClient.getStatusAsync();

    expect(status).to.equal('SUCCEEDED');

    const resultCalculatorOutputs = outputs.filter(
      (o) => o.observerId === TestStack.ResultCalculatorObserverId
    );

    expect(resultCalculatorOutputs.length).to.equal(configurationCount);
  });

  it('File reader retries and fails', async () => {
    //
    // Arrange

    const scenarioFileEvent = new FileEvent(
      FileEventType.Created,
      FileSectionType.Body,
      `ScenarioS3Key:${nanoid()}`
    );

    await testClient.initialiseTestAsync({
      testId: 'File reader retries and fails',
      mocks: {
        [TestStack.FileHeaderReaderMockId]: [
          { error: 'Test error 1' },
          { error: 'Test error 2' },
          { error: 'Test error 3' },
        ],
      },
    });

    const sutClient = testClient.getStepFunctionClient(TestStack.StateMachineId);

    // Act

    await sutClient.startExecutionAsync({ fileEvent: scenarioFileEvent });

    // Await

    const getErrorOutputs = (outputs: ObserverOutput<any>[]): ObserverOutput<any>[] =>
      outputs.filter((o) => o.observerId === TestStack.ErrorTopicObserverId);

    const { outputs, timedOut } = await testClient.pollOutputsAsync<ObserverOutput<any>>({
      until: async (o) => sutClient.isExecutionFinishedAsync() && getErrorOutputs(o).length > 0,
      intervalSeconds: 2,
      timeoutSeconds: 24,
    });

    // Assert

    expect(timedOut, 'Timed out').to.equal(false);

    const status = await sutClient.getStatusAsync();

    expect(status).to.equal('FAILED');

    const lastEvent = await sutClient.getLastEventAsync();

    expect(lastEvent).to.not.equal(undefined);
    expect(lastEvent?.executionFailedEventDetails?.cause).to.equal('Failed to read the input file');

    const errorEventRecords = getErrorOutputs(outputs)
      .map((o) => (o.event as SNSEvent).Records)
      .reduce((all, r) => all.concat(r), []);

    const errorEvent = JSON.parse(errorEventRecords[0].Sns.Message);

    expect(errorEvent.error).to.equal('Failed to read the input file');
    expect(errorEvent.cause).to.not.equal(undefined);
  });
});
