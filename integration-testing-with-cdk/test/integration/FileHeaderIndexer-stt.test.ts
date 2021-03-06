/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import { nanoid } from 'nanoid';
import {
  BucketTestClient,
  FunctionTestClient,
  TableTestClient,
  TopicTestClient,
  UnitTestClient,
} from '../../src/sls-testing-toolkit';
import { FileHeaderIndexer } from '../../src/cdk/constructs';
import { FileHeaderIndexTestStack } from '../../src/cdk/stacks/test';
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
  //
  const testClient = new UnitTestClient({
    testResourceTagKey: FileHeaderIndexTestStack.ResourceTagKey,
  });

  let fileBucket: BucketTestClient;
  let headerIndexReaderFunction: FunctionTestClient;
  let headerIndexTable: TableTestClient;
  let fileEventTopic: TopicTestClient;

  const getFileHeaderIndexesAsync = async (fileType: FileType): Promise<FileHeaderIndex[]> =>
    (await headerIndexReaderFunction.invokeAsync<FileTypeCriteria, FileHeaderIndex[]>({
      fileType,
    })) ?? [];

  before(async () => {
    //
    await testClient.initialiseClientAsync();

    fileBucket = testClient.getBucketTestClient(FileHeaderIndexTestStack.TestBucketId);

    headerIndexReaderFunction = testClient.getFunctionTestClient(
      FileHeaderIndexer.ReaderFunctionId
    );

    headerIndexTable = testClient.getTableTestClient(FileHeaderIndexer.TableId);

    fileEventTopic = testClient.getTopicTestClient(FileHeaderIndexTestStack.TestFileEventTopicId);
  });

  beforeEach(async () => {
    await fileBucket.clearAllObjectsAsync();
    await headerIndexTable.clearAllItemsAsync();
  });

  it('Header created event processed', async () => {
    await testClient.initialiseTestAsync({ testId: 'Header created event processed' });

    // Arrange

    const file = newConfigurationFile();
    const s3Key = `configuration/${file.header.name}.json`;
    const fileEvent = new FileEvent(FileEventType.Created, FileSectionType.Header, s3Key);

    await fileBucket.uploadObjectAsync(s3Key, file);

    // Act

    await fileEventTopic.publishMessageAsync(fileEvent, fileEvent.messageAttributes);

    // Await

    const { timedOut } = await testClient.pollTestAsync({
      until: async () => (await getFileHeaderIndexesAsync(file.header.fileType)).length > 0,
      intervalSeconds: 2,
      timeoutSeconds: 12,
    });

    // Assert

    expect(timedOut, 'Timed out').to.be.false;

    const fileHeaderIndexes = await getFileHeaderIndexesAsync(file.header.fileType);

    expect(fileHeaderIndexes.length).to.equal(1);

    const fileHeaderIndex = fileHeaderIndexes[0];

    const expectedFileHeaderIndex: FileHeaderIndex = {
      s3Key: fileEvent.s3Key,
      header: file.header,
    };

    expect(fileHeaderIndex).to.deep.equal(expectedFileHeaderIndex);
  });

  it('Header updated event processed', async () => {
    await testClient.initialiseTestAsync({ testId: 'Header updated event processed' });

    // Arrange

    const file = newConfigurationFile();
    const s3Key = `configuration/${file.header.name}.json`;

    await fileBucket.uploadObjectAsync(s3Key, file);

    const updatedFileEvent = new FileEvent(FileEventType.Updated, FileSectionType.Header, s3Key);

    // Act

    await fileEventTopic.publishMessageAsync(updatedFileEvent, updatedFileEvent.messageAttributes);

    // Await

    const { timedOut } = await testClient.pollTestAsync({
      until: async () => (await getFileHeaderIndexesAsync(file.header.fileType)).length > 0,
      intervalSeconds: 2,
      timeoutSeconds: 12,
    });

    // Assert

    expect(timedOut, 'Timed out').to.be.false;

    const fileHeaderIndexes = await getFileHeaderIndexesAsync(file.header.fileType);

    expect(fileHeaderIndexes.length).to.equal(1);

    const fileHeaderIndex = fileHeaderIndexes[0];

    const expectedFileHeaderIndex: FileHeaderIndex = {
      s3Key: updatedFileEvent.s3Key,
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

    // Act

    await fileEventTopic.publishMessageAsync(fileEvent, fileEvent.messageAttributes);

    // Await

    const { timedOut } = await testClient.pollTestAsync({
      until: async () =>
        (
          await getFileHeaderIndexesAsync(file.header.fileType)
        ).length > 0,
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
