/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-use-before-define */
import * as child from 'child_process';
import { nanoid } from 'nanoid';
import fs from 'fs';
import AWS from 'aws-sdk';
import { expect } from 'chai';
import { QueryOutput } from 'aws-sdk/clients/dynamodb';
import dotenv from 'dotenv';
import { Configuration, File, FileType } from '../../src/contracts';
import { FileEvent, FileEventType } from '../../src/contracts/FileEvent';
import { FileSectionType } from '../../src/contracts/FileSectionType';

dotenv.config();

const testBucketName = 'fileeventpublisherteststack-testbucket560b80bc-3dkypcn2e13w';
const testOutputsTableName = 'FileEventPublisherTestStack-TestResultsTable04198A62-1SBMVGKT0FO04';

describe('CLI-based tests', () => {
  //
  it('New file - No helpers, no polling', async () => {
    // Arrange

    const configurationFile: File<Configuration> = {
      header: {
        fileType: FileType.Configuration,
        name: `Configuration_${nanoid(10)}`,
      },
      body: {
        incomeMultiplier: 0,
      },
    };

    const configurationFileName = `${configurationFile.header.name}.json`;
    fs.writeFileSync(configurationFileName, JSON.stringify(configurationFile));

    // Act

    try {
      const uploadTestFileCommand = `aws s3 cp ${configurationFileName} s3://${testBucketName}`;
      console.log(await execCommand(uploadTestFileCommand));
    } finally {
      fs.unlinkSync(configurationFileName);
    }

    // Wait

    await new Promise((resolve) => setTimeout(resolve, 3 * 1000));

    // Assert

    const queryTestOutputsCommand = `aws dynamodb query \
      --table-name ${testOutputsTableName} \
      --key-condition-expression "s3Key = :s3Key" \
      --expression-attribute-values "{ \\":s3Key\\": { \\"S\\": \\"${configurationFileName}\\" } }"`;

    const queryResult = JSON.parse(await execCommand(queryTestOutputsCommand)) as QueryOutput;

    const fileEvents = queryResult.Items?.map(
      (item) => AWS.DynamoDB.Converter.unmarshall(item).message as FileEvent
    );

    expect(fileEvents?.length).to.equal(2);

    expect(
      fileEvents?.some(
        (e) =>
          e.s3Key === configurationFileName &&
          e.eventType === FileEventType.Created &&
          e.sectionType === FileSectionType.Header
      )
    );

    expect(
      fileEvents?.some(
        (e) =>
          e.s3Key === configurationFileName &&
          e.eventType === FileEventType.Created &&
          e.sectionType === FileSectionType.Body
      )
    );
  }).timeout(60 * 1000);

  it('New file - With polling', async () => {
    // Arrange

    const configurationFile = newConfigurationFile();
    const configurationFileName = saveFile(configurationFile);

    // Act

    try {
      await uploadTestFileAsync(configurationFileName);
    } finally {
      fs.unlinkSync(configurationFileName);
    }

    // Poll

    const timedOut = getTimedOut(12);
    const expectedEventCount = (events: FileEvent[] | undefined): boolean => events?.length === 2;

    let fileEvents: FileEvent[] | undefined;

    while (!timedOut() && !expectedEventCount(fileEvents)) {
      await waitAsync(2);
      fileEvents = await getFileEvents(configurationFileName);
    }

    // Assert

    expect(fileEvents?.length).to.equal(2);

    expect(
      fileEvents?.some(
        (e) =>
          e.s3Key === configurationFileName &&
          e.eventType === FileEventType.Created &&
          e.sectionType === FileSectionType.Header
      )
    );

    expect(
      fileEvents?.some(
        (e) =>
          e.s3Key === configurationFileName &&
          e.eventType === FileEventType.Created &&
          e.sectionType === FileSectionType.Body
      )
    );
  }).timeout(60 * 1000);

  it.only('Body update', async () => {
    // Arrange

    const configurationFile = newConfigurationFile();
    const configurationFileName = saveFile(configurationFile);

    try {
      await uploadTestFileAsync(configurationFileName);

      configurationFile.body.incomeMultiplier += 1;

      saveFile(configurationFile);

      const arrangeTimedOut = getTimedOut(12);
      const hasEvent = (events: FileEvent[] | undefined): boolean =>
        events !== undefined && events.length > 0;

      let arrangeFileEvents: FileEvent[] | undefined;

      while (!arrangeTimedOut() && !hasEvent(arrangeFileEvents)) {
        await waitAsync(1);
        arrangeFileEvents = await getFileEvents(configurationFileName);
      }

      expect(!arrangeTimedOut());

      // Act

      await uploadTestFileAsync(configurationFileName);
    } finally {
      fs.unlinkSync(configurationFileName);
    }

    // Poll

    const actTimedOut = getTimedOut(12);
    const expectedEventCount = (events: FileEvent[] | undefined): boolean => events?.length === 3;

    let fileEvents: FileEvent[] | undefined;

    while (!actTimedOut() && !expectedEventCount(fileEvents)) {
      await waitAsync(2);
      fileEvents = await getFileEvents(configurationFileName);
    }

    // Assert

    expect(fileEvents?.length).to.equal(3);

    expect(
      fileEvents?.filter(
        (e) =>
          e.s3Key === configurationFileName &&
          e.eventType === FileEventType.Updated &&
          e.sectionType === FileSectionType.Body
      ).length
    ).to.equal(1);
  }).timeout(60 * 1000);
});

function getTimedOut(timeoutSeconds: number): () => boolean {
  const timeOutThreshold = Date.now() + 1000 * timeoutSeconds;
  const timedOut = (): boolean => Date.now() > timeOutThreshold;
  return timedOut;
}

async function getFileEvents(configurationFileName: string): Promise<FileEvent[] | undefined> {
  //
  const queryTestOutputsCommand = `aws dynamodb query \
      --table-name ${testOutputsTableName} \
      --key-condition-expression "s3Key = :s3Key" \
      --expression-attribute-values "{ \\":s3Key\\": { \\"S\\": \\"${configurationFileName}\\" } }"`;

  const queryResult = JSON.parse(await execCommand(queryTestOutputsCommand)) as QueryOutput;

  const messages = queryResult.Items?.map(
    (item) => AWS.DynamoDB.Converter.unmarshall(item).message as FileEvent
  );

  console.log(`messages.length: ${messages?.length}`);

  return messages;
}

function saveFile(file: File<Configuration>): string {
  const fileName = `${file.header.name}.json`;
  fs.writeFileSync(fileName, JSON.stringify(file));
  return fileName;
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

async function uploadTestFileAsync(testFileName: string): Promise<void> {
  const uploadTestFileCommand = `aws s3 cp ${testFileName} s3://${testBucketName}`;
  console.log(await execCommand(uploadTestFileCommand));
}

async function execCommand(command: string): Promise<string> {
  //
  return new Promise((resolve, reject) => {
    child.exec(command, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

async function waitAsync(waitSeconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
}
