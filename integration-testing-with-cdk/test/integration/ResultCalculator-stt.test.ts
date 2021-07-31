/* eslint-disable @typescript-eslint/no-use-before-define */
import { S3Event } from 'aws-lambda';
import { expect } from 'chai';
import { nanoid } from 'nanoid';
import {
  BucketTestClient,
  TestObservation,
  TopicTestClient,
  UnitTestClient,
} from '../../src/sls-testing-toolkit';
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
  //
  const testClient = new UnitTestClient({
    testResourceTagKey: TestStack.ResourceTagKey,
  });

  let testBucket: BucketTestClient;
  let testTopic: TopicTestClient;

  before(async () => {
    await testClient.initialiseClientAsync();
    testBucket = testClient.getBucketTestClient(TestStack.TestBucketId);
    testTopic = testClient.getTopicTestClient(TestStack.TestFileEventTopicId);
  });

  beforeEach(async () => {
    await testBucket.clearAllObjectsAsync();
  });

  it('New scenario, single configuration', async () => {
    // Arrange

    const fileEvent = new FileEvent(
      FileEventType.Created,
      FileSectionType.Body,
      `ScenarioS3Key-${nanoid()}`
    );

    const scenarioFile = newScenarioFile();

    await testBucket.uploadObjectAsync(fileEvent.s3Key, scenarioFile);

    const configurationFile = newConfigurationFile();

    const configurationS3Key = `ConfigurationS3Key-${nanoid()}`;

    await testBucket.uploadObjectAsync(configurationS3Key, configurationFile);

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
            response: configurationFileHeaderIndexes,
          },
        ],
      },
    });

    // Act

    await testTopic.publishMessageAsync(fileEvent, fileEvent.messageAttributes);

    const expectedResultS3Key = `S-${fileEvent.s3Key}-C-${configurationS3Key}`;

    // Await

    const { timedOut, observations } = await testClient.pollTestAsync({
      until: async (o) =>
        TestObservation.filterById(o, TestStack.BucketEventObserverId).some((beo) =>
          (beo.data as S3Event).Records.some((r) => r.s3.object.key === expectedResultS3Key)
        ),
      intervalSeconds: 2,
      timeoutSeconds: 12,
    });

    // Assert

    expect(timedOut, 'Timed out').to.equal(false);

    const resultRecords = TestObservation.filterById(
      observations,
      TestStack.BucketEventObserverId
    ).filter((o) =>
      (o.data as S3Event).Records.filter((r) => r.s3.object.key === expectedResultS3Key)
    );

    expect(resultRecords[0].data.Records[0].eventName.startsWith('ObjectCreated:'));
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
