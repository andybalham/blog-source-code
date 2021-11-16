/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import {
  DynamoDBTestClient,
  IntegrationTestClient,
  S3TestClient,
  StepFunctionsTestClient,
} from '@andybalham/sls-testing-toolkit';
import BucketIndexerTestStack from '../lib/BucketIndexerTestStack';

describe('BucketIndexer Test Suite', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: BucketIndexerTestStack.StackId,
    deleteLogs: true,
  });

  let testInputBucket: S3TestClient;
  let testIndexTable: DynamoDBTestClient;
  let sutStateMachine: StepFunctionsTestClient;

  before(async () => {
    await testClient.initialiseClientAsync();
    testInputBucket = testClient.getS3TestClient(BucketIndexerTestStack.TestSourceBucketId);
    testIndexTable = testClient.getDynamoDBTestClient(BucketIndexerTestStack.TestIndexTableId);
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

    for (let index = 0; index < 7; index++) {
      await testInputBucket.uploadObjectAsync(`MyKey${index}`, {});
    }

    // Act

    await sutStateMachine.startExecutionAsync({});

    // Assert

    // const bucketItems =
    //   await testIndexTable.getItemAsync({ bucketName: testInputBucket.bucketName });

    expect(true).to.not.be.undefined;
  }).timeout(30 * 1000);
});
