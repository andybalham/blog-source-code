/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import {
  IntegrationTestClient,
  S3TestClient,
  StepFunctionsTestClient,
} from '@andybalham/sls-testing-toolkit';
import BucketIndexerTestStack from '../lib/BucketIndexerTestStack';
import DynamoDBTestClientExt from './DynamoDBTestClientExt';

describe('BucketIndexer Test Suite', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: BucketIndexerTestStack.StackId,
    deleteLogs: true,
  });

  let testInputBucket: S3TestClient;
  let testIndexTable: DynamoDBTestClientExt;
  let sutStateMachine: StepFunctionsTestClient;

  before(async () => {
    await testClient.initialiseClientAsync();
    testInputBucket = testClient.getS3TestClient(BucketIndexerTestStack.TestSourceBucketId);
    testIndexTable = new DynamoDBTestClientExt(
      testClient.getDynamoDBTestClient(BucketIndexerTestStack.TestIndexTableId)
    );
    sutStateMachine = testClient.getStepFunctionsTestClient(
      BucketIndexerTestStack.SUTStateMachineId
    );
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
    await testInputBucket.clearAllObjectsAsync();
    await testIndexTable.clearAllItemsAsync();
  });

  it.only(`Indexes as expected`, async () => {
    // Arrange

    const expectedItemCount = 7;

    const getObjectKey = (index: number): string => `MyKey${index}`;

    for (let index = 0; index < expectedItemCount; index++) {
      await testInputBucket.uploadObjectAsync(getObjectKey(index), {});
    }

    // Act

    await sutStateMachine.startExecutionAsync({});

    // Await

    const { timedOut } = await testClient.pollTestAsync({
      until: async () => {
        const bucketItems = await testIndexTable.getItemsByPartitionKeyAsync<any>(
          'bucketName',
          testInputBucket.bucketName
        );
        return bucketItems.length === expectedItemCount;
      },
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;

    for (let index = 0; index < expectedItemCount; index++) {
      const item = await testIndexTable.getItemAsync({
        bucketName: testInputBucket.bucketName,
        key: getObjectKey(index),
      });
      expect(item).to.not.be.undefined;
    }
  }).timeout(30 * 1000);
});
