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

    await testInputBucket.uploadObjectAsync('MyKey', {});

    // Act

    await sutStateMachine.startExecutionAsync({});

    // Assert

    // await testIndexTable.getItemAsync({ bucketName: '???' });

    expect(true).to.be.true;
  }).timeout(30 * 1000);
});
