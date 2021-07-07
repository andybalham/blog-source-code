/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import { nanoid } from 'nanoid';
import { UnitTestClient } from '../../src/aws-integration-test';
import { FileHeaderIndexer } from '../../src/cdk/constructs';
import { HeaderIndexTestStack } from '../../src/cdk/stacks/test';
import { FileHeaderIndex, FileType } from '../../src/contracts';
import { FileEvent, FileEventType } from '../../src/contracts/FileEvent';
import { FileSectionType } from '../../src/contracts/FileSectionType';
import { FileTypeCriteria } from '../../src/contracts/FileTypeCriteria';

describe('HeaderIndex Tests', () => {
  const testClient = new UnitTestClient({
    testResourceTagKey: HeaderIndexTestStack.ResourceTagKey,
  });

  before(async () => {
    await testClient.initialiseAsync();
  });

  it('Header created', async () => {
    // Arrange

    await testClient.beginTestAsync('Header created');

    const fileEvent = new FileEvent(
      FileEventType.Created,
      FileSectionType.Header,
      `Configuration_${nanoid()}.json`,
      {
        fileType: FileType.Configuration,
        name: `Name_${nanoid()}`,
      }
    );

    const getFileHeaderIndexes = async (): Promise<FileHeaderIndex[]> =>
      (await testClient.invokeFunctionAsync<FileTypeCriteria, FileHeaderIndex[]>(
        FileHeaderIndexer.ReaderFunctionId,
        { fileType: fileEvent.header.fileType }
      )) ?? [];

    // Act

    await testClient.publishMessageAsync(
      HeaderIndexTestStack.TestFileEventTopicId,
      fileEvent,
      fileEvent.messageAttributes
    );

    // Await

    const { timedOut } = await testClient.pollAsync({
      until: async () =>
        (await getFileHeaderIndexes()).some((i) => i.header.name === fileEvent.header.name),
      intervalSeconds: 2,
      timeoutSeconds: 12,
    });

    // Assert

    expect(timedOut).to.be.false;

    const fileHeaderIndexes = (await getFileHeaderIndexes()).filter(
      (i) => i.header.name === fileEvent.header.name
    );

    expect(fileHeaderIndexes.length).to.equal(1);

    const fileHeaderIndex = fileHeaderIndexes[0];

    const expectedFileHeaderIndex: FileHeaderIndex = {
      s3Key: fileEvent.s3Key,
      header: fileEvent.header,
    };

    expect(fileHeaderIndex).to.deep.equal(expectedFileHeaderIndex);
  });
});
