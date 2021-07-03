/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-use-before-define */
import { nanoid } from 'nanoid';
import { expect } from 'chai';
import { SNSEvent } from 'aws-lambda/trigger/sns';
import { Configuration, File, FileType } from '../../src/contracts';
import { FileEvent, FileEventType } from '../../src/contracts/FileEvent';
import { FileSectionType } from '../../src/contracts/FileSectionType';
import FileEventPublisherTestStack from '../../src/cdk/stacks/test/FileEventPublisherTestStack-v2';
import { UnitTestClient } from '../../src/aws-integration-test';

describe('Tests using the SDK', () => {
  const testClient = new UnitTestClient({
    testResourceTagKey: FileEventPublisherTestStack.ResourceTagKey,
  });

  before(async () => {
    await testClient.initialiseAsync();
  });

  it('New file upload', async () => {
    await testClient.beginTestAsync('New file upload');

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

    const { finalOutputs, timedOut } = await testClient.pollAsync<SNSEvent>({
      until: (outputs) => outputs.length === 2,
      intervalSeconds: 2,
      timeoutSeconds: 12,
    });

    // Assert

    expect(timedOut).to.equal(false);

    const fileEvents = convertOutputsToFileEvents(finalOutputs);

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
  }).timeout(60 * 1000);
});

function convertOutputsToFileEvents(outputs: SNSEvent[]): FileEvent[] {
  return outputs
    .map((o) => o.Records.map((r) => JSON.parse(r.Sns.Message) as FileEvent))
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
