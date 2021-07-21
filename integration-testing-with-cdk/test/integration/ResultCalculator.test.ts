/* eslint-disable @typescript-eslint/no-use-before-define */
import { S3Event } from 'aws-lambda';
import { expect } from 'chai';
import { nanoid } from 'nanoid';
import { ObserverOutput, UnitTestClient } from '../../src/aws-integration-test';
import { ResultCalculatorTestStack as TestStack } from '../../src/cdk/stacks/test';
import {
  Configuration,
  File,
  FileEvent,
  FileEventType,
  FileHeaderIndex,
  FileType,
  Scenario,
} from '../../src/contracts';
import { FileSectionType } from '../../src/contracts/FileSectionType';

describe('ResultCalculator Tests', () => {
  const testClient = new UnitTestClient({
    testResourceTagKey: TestStack.ResourceTagKey,
  });

  before(async () => {
    await testClient.initialiseClientAsync();
  });

  beforeEach(async () => {
    // TODO 08Jul21: Clear down test bucket and underlying table?
  });

  it('New scenario, single configuration', async () => {
    // Arrange

    const fileEvent = new FileEvent(
      FileEventType.Created,
      FileSectionType.Body,
      `ScenarioS3Key-${nanoid()}`
    );

    const scenarioFile = newScenarioFile();

    await testClient.uploadObjectToBucketAsync(
      TestStack.TestBucketId,
      fileEvent.s3Key,
      scenarioFile
    );

    const configurationFile = newConfigurationFile();

    const configurationS3Key = `ConfigurationS3Key-${nanoid()}`;

    await testClient.uploadObjectToBucketAsync(
      TestStack.TestBucketId,
      configurationS3Key,
      configurationFile
    );

    const configurationFileHeaderIndexes: FileHeaderIndex[] = [
      {
        s3Key: configurationS3Key,
        header: { fileType: FileType.Configuration, name: `ConfigurationName:${nanoid()}` },
      },
    ];

    await testClient.initialiseTestAsync({
      testId: 'New scenario, single configuration',
      mocks: {
        [TestStack.FileHeaderIndexReaderMockId]: [
          {
            assert: { requiredProperties: ['fileType'] },
            response: configurationFileHeaderIndexes,
          },
        ],
      },
    });

    // Act

    await testClient.publishMessageToTopicAsync(
      TestStack.TestFileEventTopicId,
      fileEvent,
      fileEvent.messageAttributes
    );

    const expectedS3Key = `S-${fileEvent.s3Key}-C-${configurationS3Key}`;

    // Await

    const { timedOut, outputs } = await testClient.pollOutputsAsync<ObserverOutput<any>>({
      until: async (o) =>
        UnitTestClient.getObserverOutputs<S3Event>(o, TestStack.BucketEventObserverId).some((e) =>
          e.event.Records.some((r) => r.s3.object.key === expectedS3Key)
        ),
      intervalSeconds: 2,
      timeoutSeconds: 12,
    });

    // Assert

    expect(timedOut, 'Timed out').to.equal(false);

    const resultRecords = UnitTestClient.getObserverOutputs<S3Event>(
      outputs,
      TestStack.BucketEventObserverId
    ).filter((e) => e.event.Records.filter((r) => r.s3.object.key === expectedS3Key));

    // TODO 21Jul21: Make this more robust
    expect(resultRecords[0].event.Records[0].eventName.startsWith('ObjectCreated:'));
  });
});

function newScenarioFile(): File<Scenario> {
  //
  const configFile: File<Scenario> = {
    header: {
      fileType: FileType.Scenario,
      name: `Scenario_${nanoid(10)}`,
    },
    body: {
      income: 40000,
    },
  };

  return configFile;
}

function newConfigurationFile(): File<Configuration> {
  //
  const configFile: File<Configuration> = {
    header: {
      fileType: FileType.Configuration,
      name: `Configuration_${nanoid(10)}`,
    },
    body: {
      incomeMultiplier: 0,
    },
  };

  return configFile;
}
