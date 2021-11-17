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
    const t = testClient.getDynamoDBTestClient(BucketIndexerTestStack.TestIndexTableId);
    testIndexTable = new DynamoDBTestClientExt(t.region, t.tableName);
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

    for (let index = 0; index < expectedItemCount; index++) {
      await testInputBucket.uploadObjectAsync(`MyKey${index}`, {});
    }

    // Act

    await sutStateMachine.startExecutionAsync({});

    // Await
    async function getBucketItems(): Promise<any[]> {
      return testIndexTable.getItemsByPartitionKeyAsync<any>(
        'bucketName',
        testInputBucket.bucketName
      );
    }

    const { timedOut } = await testClient.pollTestAsync({
      until: async () => {
        const bucketItems = await getBucketItems();
        return bucketItems.length === expectedItemCount;
      },
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;

    const bucketItems = await getBucketItems();
    expect(bucketItems).to.not.be.undefined;
    expect(bucketItems.length).to.equal(expectedItemCount);
    //
  }).timeout(30 * 1000);
});
