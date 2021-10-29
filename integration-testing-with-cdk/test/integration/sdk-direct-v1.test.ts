/* eslint-disable no-await-in-loop */
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
    const testResources = await getResourcesByTagKeyAsync(
      FileEventPublisherTestStack.ResourceKey);

    testBucketName = getBucketNameByTag(
      testResources, 
      FileEventPublisherTestStack.TestBucketTag);
    
    testResultsTableName = getTableNameByTag(
      testResources,
      FileEventPublisherTestStack.TestResultsTableTag
    );
  });

  it('New file', async () => {
    // Arrange

    const configurationFile = newConfigurationFile();
    const configurationFileS3Key = configurationFile.header.name;

    // Act

    await uploadObjectToBucketAsync(testBucketName, configurationFileS3Key, configurationFile);

    await new Promise((resolve) => setTimeout(resolve, 3 * 1000));

    // Assert

    const fileEvents = await getFileEvents(testResultsTableName, configurationFile.header.name);

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

async function getFileEvents(
  testResultsTableName: string,
  configurationFileName: string
): Promise<FileEvent[] | undefined> {
  const db = new AWS.DynamoDB.DocumentClient({ region: getRegion() });

  const queryParams /*: QueryInput */ = {
    // QueryInput results in a 'Condition parameter type does not match schema type'
    TableName: testResultsTableName,
    KeyConditionExpression: `s3Key = :s3Key`,
    ExpressionAttributeValues: {
      ':s3Key': configurationFileName,
    },
  };

  const queryResult = await db.query(queryParams).promise();

  const fileEvents = queryResult.Items?.map((item) => item.message as FileEvent);

  return fileEvents;
}
