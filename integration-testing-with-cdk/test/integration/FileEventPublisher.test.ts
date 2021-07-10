/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-use-before-define */
import { nanoid } from 'nanoid';
import { expect } from 'chai';
import { SNSEvent } from 'aws-lambda/trigger/sns';
import { Configuration, File, FileType } from '../../src/contracts';
import { FileEvent, FileEventType } from '../../src/contracts/FileEvent';
import { FileSectionType } from '../../src/contracts/FileSectionType';
import FileEventPublisherTestStack from '../../src/cdk/stacks/test/FileEventPublisherTestStack-v2';
import { UnitTestClient } from '../../src/aws-integration-test';

describe('FileEventPublisher Tests', () => {
  const testClient = new UnitTestClient({
    testResourceTagKey: FileEventPublisherTestStack.ResourceTagKey,
  });

  before(async () => {
    await testClient.initialiseClientAsync();
  });

  it('New file upload', async () => {
    await testClient.initialiseTestAsync('New file upload');

    // Arrange

    const configurationFile = newConfigurationFile();
    const configurationFileS3Key = configurationFile.header.name;

    // Act

    await testClient.uploadObjectToBucketAsync(
      FileEventPublisherTestStack.TestBucketId,
      configurationFileS3Key,
      configurationFile
    );

    // Await

    const { outputs, timedOut } = await testClient.pollOutputsAsync<SNSEvent>({
      until: async (o) => getFileEventCount(o) === 2,
      intervalSeconds: 2,
      timeoutSeconds: 12,
    });

    // Assert

    const fileEvents = getFileEvents(outputs);

    expect(timedOut).to.equal(false);

    expect(fileEvents.length).to.equal(2);

    expect(
      fileEvents.some(
        (e) =>
          e.s3Key === configurationFileS3Key &&
          e.eventType === FileEventType.Created &&
          e.sectionType === FileSectionType.Header
      )
    );

    expect(
      fileEvents.some(
        (e) =>
          e.s3Key === configurationFileS3Key &&
          e.eventType === FileEventType.Created &&
          e.sectionType === FileSectionType.Body
      )
    );
  });

  [
    {
      updateFile: (file: File<Configuration>): void => {
        file.header.description = nanoid();
      },
      expectedEventCount: 3,
      expectedHeaderEvent: true,
      expectedBodyEvent: false,
    },
    {
      updateFile: (file: File<Configuration>): void => {
        file.body.incomeMultiplier += 1;
      },
      expectedEventCount: 3,
      expectedHeaderEvent: false,
      expectedBodyEvent: true,
    },
    {
      updateFile: (file: File<Configuration>): void => {
        file.header.description = nanoid();
        file.body.incomeMultiplier += 1;
      },
      expectedEventCount: 4,
      expectedHeaderEvent: true,
      expectedBodyEvent: true,
    },
  ].forEach((theory) => {
    //
    const testId = `File update: ${JSON.stringify({
      header: theory.expectedHeaderEvent,
      body: theory.expectedBodyEvent,
    })}`;

    it(testId, async () => {
      await testClient.initialiseTestAsync(testId);

      // Arrange

      const configurationFile = newConfigurationFile();
      const configurationFileS3Key = configurationFile.header.name;

      await testClient.uploadObjectToBucketAsync(
        FileEventPublisherTestStack.TestBucketId,
        configurationFileS3Key,
        configurationFile
      );

      const { timedOut: arrangeTimedOut } = await testClient.pollOutputsAsync<SNSEvent>({
        until: async (o) => getFileEventCount(o) === 2,
        intervalSeconds: 2,
        timeoutSeconds: 12,
      });

      expect(arrangeTimedOut).to.equal(false);

      theory.updateFile(configurationFile);

      // Act

      await testClient.uploadObjectToBucketAsync(
        FileEventPublisherTestStack.TestBucketId,
        configurationFileS3Key,
        configurationFile
      );

      // Await

      const { outputs, timedOut } = await testClient.pollOutputsAsync<SNSEvent>({
        until: async (o) => getFileEventCount(o) >= theory.expectedEventCount,
        intervalSeconds: 2,
        timeoutSeconds: 12,
      });

      // Assert

      const fileEvents = getFileEvents(outputs);

      expect(timedOut).to.equal(false);

      expect(fileEvents.length).to.equal(theory.expectedEventCount);

      expect(
        theory.expectedHeaderEvent &&
          fileEvents.some(
            (e) =>
              e.s3Key === configurationFileS3Key &&
              e.eventType === FileEventType.Updated &&
              e.sectionType === FileSectionType.Header
          )
      );

      expect(
        theory.expectedBodyEvent &&
          fileEvents.some(
            (e) =>
              e.s3Key === configurationFileS3Key &&
              e.eventType === FileEventType.Updated &&
              e.sectionType === FileSectionType.Body
          )
      );
    });
  });
}).timeout(60 * 1000);

function getFileEventCount(outputs: SNSEvent[]): number {
  return getFileEvents(outputs).length;
}

function getFileEvents(outputs: SNSEvent[]): FileEvent[] {
  return outputs
    .map((o) => o.Records.map((r) => JSON.parse(r.Sns.Message)))
    .reduce((allEvents, events) => allEvents.concat(events), []);
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
