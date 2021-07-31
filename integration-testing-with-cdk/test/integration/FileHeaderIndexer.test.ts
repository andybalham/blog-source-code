/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import { nanoid } from 'nanoid';
import { UnitTestClient } from '../../src/aws-integration-test';
import { FileHeaderIndexer } from '../../src/cdk/constructs';
import { FileHeaderIndexTestStack } from '../../src/cdk/stacks/test';
import FileHeaderIndexerTestStack from '../../src/cdk/stacks/test/FileHeaderIndexTestStack';
import {
  File,
  FileEvent,
  FileEventType,
  Configuration,
  FileHeaderIndex,
  FileType,
} from '../../src/contracts';
import { FileSectionType } from '../../src/contracts/FileSectionType';
import { FileTypeCriteria } from '../../src/contracts/FileTypeCriteria';

describe('FileHeaderIndexer Tests', () => {
  const testClient = new UnitTestClient({
    testResourceTagKey: FileHeaderIndexTestStack.ResourceTagKey,
  });

  before(async () => {
    await testClient.initialiseClientAsync();
  });

  beforeEach(async () => {
    // TODO 08Jul21: Clear down test bucket and underlying table?
  });

  it('Single header indexed', async () => {
    await testClient.initialiseTestAsync({ testId: 'Single header indexed' });

    // Arrange

    const file = newConfigurationFile();
    const s3Key = `configuration/${file.header.name}.json`;
    const fileEvent = new FileEvent(FileEventType.Created, FileSectionType.Header, s3Key);

    const getFileHeaderIndexesAsync = async (): Promise<FileHeaderIndex[]> =>
      (await testClient.invokeFunctionAsync<FileTypeCriteria, FileHeaderIndex[]>(
        FileHeaderIndexer.ReaderFunctionId,
        { fileType: file.header.fileType }
      )) ?? [];

    await testClient.uploadObjectToBucketAsync(
      FileHeaderIndexerTestStack.TestBucketId,
      s3Key,
      file
    );

    // Act

    await testClient.publishMessageToTopicAsync(
      FileHeaderIndexTestStack.TestFileEventTopicId,
      fileEvent,
      fileEvent.messageAttributes
    );

    // Await

    const { timedOut } = await testClient.pollOutputsAsync({
      until: async () =>
        (await getFileHeaderIndexesAsync()).some((i) => i.header.name === file.header.name),
      intervalSeconds: 2,
      timeoutSeconds: 12,
    });

    // Assert

    expect(timedOut, 'Timed out').to.be.false;

    const allFileHeaderIndexes = await getFileHeaderIndexesAsync();

    const fileHeaderIndexes = allFileHeaderIndexes.filter(
      (i) => i.header.name === file.header.name
    );

    expect(fileHeaderIndexes.length).to.equal(1);

    const fileHeaderIndex = fileHeaderIndexes[0];

    const expectedFileHeaderIndex: FileHeaderIndex = {
      s3Key: fileEvent.s3Key,
      header: file.header,
    };

    expect(fileHeaderIndex).to.deep.equal(expectedFileHeaderIndex);
  });

  it('Single header updated', async () => {
    await testClient.initialiseTestAsync({ testId: 'Single header updated' });

    // Arrange

    const file = newConfigurationFile();
    const s3Key = `configuration/${file.header.name}.json`;
    const createdFileEvent = new FileEvent(FileEventType.Created, FileSectionType.Header, s3Key);

    const getFileHeaderIndexesAsync = async (): Promise<FileHeaderIndex[]> =>
      (await testClient.invokeFunctionAsync<FileTypeCriteria, FileHeaderIndex[]>(
        FileHeaderIndexer.ReaderFunctionId,
        { fileType: file.header.fileType }
      )) ?? [];

    await testClient.uploadObjectToBucketAsync(
      FileHeaderIndexerTestStack.TestBucketId,
      s3Key,
      file
    );

    await testClient.publishMessageToTopicAsync(
      FileHeaderIndexTestStack.TestFileEventTopicId,
      createdFileEvent,
      createdFileEvent.messageAttributes
    );

    const { timedOut: arrangeTimedOut } = await testClient.pollOutputsAsync({
      until: async () =>
        (await getFileHeaderIndexesAsync()).some((i) => i.header.name === file.header.name),
      intervalSeconds: 2,
      timeoutSeconds: 12,
    });

    expect(arrangeTimedOut, 'Arrange timed out').to.be.false;

    file.header.description = `Description ${nanoid()}`;

    await testClient.uploadObjectToBucketAsync(
      FileHeaderIndexerTestStack.TestBucketId,
      s3Key,
      file
    );

    const updatedFileEvent = new FileEvent(FileEventType.Updated, FileSectionType.Header, s3Key);

    // Act

    await testClient.publishMessageToTopicAsync(
      FileHeaderIndexTestStack.TestFileEventTopicId,
      updatedFileEvent,
      updatedFileEvent.messageAttributes
    );

    // Await

    const { timedOut } = await testClient.pollOutputsAsync({
      until: async () =>
        (await getFileHeaderIndexesAsync()).some((i) => i.header.name === file.header.name),
      intervalSeconds: 2,
      timeoutSeconds: 12,
    });

    // Assert

    expect(timedOut, 'Timed out').to.be.false;

    const allFileHeaderIndexes = await getFileHeaderIndexesAsync();

    const fileHeaderIndexes = allFileHeaderIndexes.filter(
      (i) => i.header.name === file.header.name
    );

    expect(fileHeaderIndexes.length).to.equal(1);

    const fileHeaderIndex = fileHeaderIndexes[0];

    const expectedFileHeaderIndex: FileHeaderIndex = {
      s3Key: createdFileEvent.s3Key,
      header: file.header,
    };

    expect(fileHeaderIndex).to.deep.equal(expectedFileHeaderIndex);
  });

  it('Body event ignored', async () => {
    // Arrange

    await testClient.initialiseTestAsync({ testId: 'Body event ignored' });

    const file = newConfigurationFile();
    const s3Key = `configuration/${file.header.name}.json`;
    const fileEvent = new FileEvent(FileEventType.Created, FileSectionType.Body, s3Key);

    const getFileHeaderIndexesAsync = async (): Promise<FileHeaderIndex[]> =>
      (await testClient.invokeFunctionAsync<FileTypeCriteria, FileHeaderIndex[]>(
        FileHeaderIndexer.ReaderFunctionId,
        { fileType: file.header.fileType }
      )) ?? [];

    // Act

    await testClient.publishMessageToTopicAsync(
      FileHeaderIndexTestStack.TestFileEventTopicId,
      fileEvent,
      fileEvent.messageAttributes
    );

    // Await

    const { timedOut } = await testClient.pollOutputsAsync({
      until: async () =>
        (await getFileHeaderIndexesAsync()).some((i) => i.header.name === file.header.name),
      intervalSeconds: 2,
      timeoutSeconds: 6,
    });

    // Assert

    expect(timedOut, 'Timed out').to.be.true;
  });
});

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
