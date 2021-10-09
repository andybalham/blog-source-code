/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-use-before-define */
import AWS from 'aws-sdk';
import { ObjectList } from 'aws-sdk/clients/s3';
import { nanoid } from 'nanoid';
import { expect } from 'chai';
import {
  uploadObjectToBucketAsync,
  getRegion,
  getTimedOut,
  waitAsync,
  getResourcesByTagKeyAsync,
  getBucketNameByTag,
  getTableNameByTag,
} from './testFunctions';
import { Configuration, File, FileType } from '../../src/contracts';
import { FileEvent, FileEventType } from '../../src/contracts/FileEvent';
import { FileSectionType } from '../../src/contracts/FileSectionType';
import FileEventPublisherTestStack from '../../src/cdk/stacks/test/FileEventPublisherTestStack-v1';

describe('Tests using the SDK', () => {
  let testBucketName: string;
  let testResultsTableName: string;

  before(async () => {
    const testResources = await getResourcesByTagKeyAsync(FileEventPublisherTestStack.ResourceKey);
    testBucketName = getBucketNameByTag(testResources, FileEventPublisherTestStack.TestBucketTag);
    testResultsTableName = getTableNameByTag(
      testResources,
      FileEventPublisherTestStack.TestResultsTableTag
    );
  });

  it('New file - With polling', async () => {
    // Arrange

    const configurationFile = newConfigurationFile();
    const configurationFileS3Key = configurationFile.header.name;

    // Act

    await uploadObjectToBucketAsync(testBucketName, configurationFileS3Key, configurationFile);

    // Await

    const timedOut = getTimedOut(12);
    const expectedEventCount = (events: FileEvent[] | undefined): boolean => events?.length === 2;

    let fileEvents: FileEvent[] | undefined;

    while (!timedOut() && !expectedEventCount(fileEvents)) {
      // eslint-disable-next-line no-await-in-loop
      await waitAsync(2);
      // TODO 05Oct21: Reinstate the following
      fileEvents = []; // await getFileEvents(configurationFileName);
    }

    // Assert

    expect(fileEvents?.length).to.equal(2);

    expect(
      fileEvents?.some(
        (e) =>
          e.s3Key === configurationFileS3Key &&
          e.eventType === FileEventType.Created &&
          e.sectionType === FileSectionType.Header
      )
    );

    expect(
      fileEvents?.some(
        (e) =>
          e.s3Key === configurationFileS3Key &&
          e.eventType === FileEventType.Created &&
          e.sectionType === FileSectionType.Body
      )
    );
  }).timeout(60 * 1000);
});

const listAllKeysAsync = async (
  bucket: string,
  prefix?: string,
  token?: string
): Promise<ObjectList> => {
  const s3 = new AWS.S3({ region: getRegion() });
  const opts = {
    Bucket: bucket,
    ContinuationToken: token,
    ...(prefix && { Prefix: prefix }),
  };
  const data = await s3.listObjectsV2(opts).promise();
  let allKeys = data.Contents || [];
  if (data.IsTruncated) {
    allKeys = allKeys.concat(await listAllKeysAsync(bucket, prefix, data.NextContinuationToken));
  }

  return allKeys;
};

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
