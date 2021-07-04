/* eslint-disable import/no-extraneous-dependencies */
import { ResourceTagMappingList } from 'aws-sdk/clients/resourcegroupstaggingapi';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import * as cdk from '@aws-cdk/core';
import IntegrationTestStack from './IntegrationTestStack';
import { CurrentTestItem, TestItemPrefix } from './TestItem';

dotenv.config();

export interface UnitTestClientProps {
  testResourceTagKey: string;
}

export default class UnitTestClient {
  //
  static readonly tagging = new AWS.ResourceGroupsTaggingAPI({
    region: UnitTestClient.getRegion(),
  });

  static readonly db = new AWS.DynamoDB.DocumentClient({ region: UnitTestClient.getRegion() });

  static readonly s3 = new AWS.S3({ region: UnitTestClient.getRegion() });

  testResourceTagMappingList: ResourceTagMappingList;

  integrationTestTableName: string;

  testId: string;

  constructor(private props: UnitTestClientProps) {}

  // Static ------------------------------------------------------------------

  static getRegion(): string {
    if (process.env.AWS_REGION === undefined)
      throw new Error('process.env.AWS_REGION === undefined');
    return process.env.AWS_REGION;
  }

  static async sleepAsync(seconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  static async getResourcesByTagKeyAsync(key: string): Promise<ResourceTagMappingList> {
    // TODO 27Jun21: PaginationToken
    const resources = await UnitTestClient.tagging
      .getResources({
        TagFilters: [
          {
            Key: key,
          },
        ],
      })
      .promise();

    return resources.ResourceTagMappingList ?? [];
  }

  // Instance ----------------------------------------------------------------

  async initialiseAsync(): Promise<void> {
    //
    this.testResourceTagMappingList = await UnitTestClient.getResourcesByTagKeyAsync(
      this.props.testResourceTagKey
    );

    this.integrationTestTableName = this.getTableNameByTag(
      new cdk.Tag(this.props.testResourceTagKey, IntegrationTestStack.IntegrationTestTableId)
    );
  }

  async beginTestAsync<T>(testId: string, inputs?: T): Promise<void> {
    if (!testId) {
      throw new Error(`A testId must be specified`);
    }

    this.testId = testId;

    // Clear down all data related to the test

    // TODO 03Jul21: Use LastEvaluatedKey
    const testQueryParams /*: QueryInput */ = {
      // QueryInput results in a 'Condition parameter type does not match schema type'
      TableName: this.integrationTestTableName,
      KeyConditionExpression: `PK = :PK`,
      ExpressionAttributeValues: {
        ':PK': testId,
      },
    };

    const testQueryOutput = await UnitTestClient.db.query(testQueryParams).promise();

    // TODO 03Jul21: Use batchWrite with delete requests
    if (testQueryOutput.Items) {
      const deletePromises = testQueryOutput.Items.map((item) =>
        UnitTestClient.db
          .delete({
            TableName: this.integrationTestTableName,
            Key: { PK: item.PK, SK: item.SK },
          })
          .promise()
      );
      await Promise.all(deletePromises);
    }

    // Set the current test and inputs

    const currentTestItem: CurrentTestItem<T> = {
      PK: 'Current',
      SK: 'Test',
      testId,
      inputs,
    };

    await UnitTestClient.db
      .put({
        TableName: this.integrationTestTableName,
        Item: currentTestItem,
      })
      .promise();
  }

  async pollAsync<T>({
    until,
    intervalSeconds,
    timeoutSeconds,
  }: {
    until: (outputs: T[]) => boolean;
    intervalSeconds: number;
    timeoutSeconds: number;
  }): Promise<{ outputs: T[]; timedOut: boolean }> {
    //
    const timeOutThreshold = Date.now() + 1000 * timeoutSeconds;

    const timedOut = (): boolean => Date.now() > timeOutThreshold;

    let outputs = new Array<T>();

    while (!timedOut() && !until(outputs)) {
      // eslint-disable-next-line no-await-in-loop
      await UnitTestClient.sleepAsync(intervalSeconds);
      // eslint-disable-next-line no-await-in-loop
      outputs = await this.getTestOutputsAsync<T>();
    }

    return {
      timedOut: !until(outputs),
      outputs: outputs,
    };
  }

  async getTestOutputsAsync<T>(): Promise<T[]> {
    //
    const queryOutputsParams /*: QueryInput */ = {
      // QueryInput results in a 'Condition parameter type does not match schema type'
      TableName: this.integrationTestTableName,
      KeyConditionExpression: `PK = :PK and begins_with(SK, :SKPrefix)`,
      ExpressionAttributeValues: {
        ':PK': this.testId,
        ':SKPrefix': TestItemPrefix.TestOutput,
      },
    };

    const queryOutputsOutput = await UnitTestClient.db.query(queryOutputsParams).promise();

    if (!queryOutputsOutput.Items) {
      return [];
    }

    // TODO 03Jul21: Use LastEvaluatedKey
    const outputs = queryOutputsOutput.Items.map((i) => i.output as T);

    return outputs;
  }

  async uploadObjectToBucketAsync(
    bucketId: string,
    key: string,
    object: Record<string, any>
  ): Promise<void> {
    //
    const bucketName = this.getBucketNameByTag(
      new cdk.Tag(this.props.testResourceTagKey, bucketId)
    );

    await UnitTestClient.s3
      .upload({
        Bucket: bucketName,
        Key: key,
        Body: JSON.stringify(object),
      })
      .promise();
  }

  // Private ------------------------------------------------------

  private static getResourceArnByTag(
    resources: ResourceTagMappingList,
    targetTag: cdk.Tag
  ): string {
    //
    if (resources === undefined) throw new Error('resources === undefined');

    const tagMatches = resources.filter(
      (r) => r.Tags && r.Tags.some((t) => t.Key === targetTag.key && t.Value === targetTag.value)
    );

    if (tagMatches.length !== 1) {
      throw new Error(
        `Found ${tagMatches.length} matches for ${JSON.stringify(
          targetTag
        )}, when 1 was expected: ${JSON.stringify(tagMatches)}`
      );
    }

    const tagMatchArn = tagMatches[0].ResourceARN ?? 'undefined';
    return tagMatchArn;
  }

  private static getResourceNameFromArn(
    resources: ResourceTagMappingList,
    targetTag: cdk.Tag,
    arnPattern: RegExp
  ): string {
    //
    const tagMatchArn = UnitTestClient.getResourceArnByTag(resources, targetTag);

    const bucketArnMatch = tagMatchArn.match(arnPattern);

    if (!bucketArnMatch || !bucketArnMatch.groups?.name) {
      throw new Error(`ARN did not match expected pattern: ${tagMatchArn}`);
    }

    const bucketName = bucketArnMatch.groups.name;
    return bucketName;
  }

  private getBucketNameByTag(targetTag: cdk.Tag): string {
    const arnPattern = /^arn:aws:s3:::(?<name>.*)/;
    const resourceName = UnitTestClient.getResourceNameFromArn(
      this.testResourceTagMappingList,
      targetTag,
      arnPattern
    );
    return resourceName;
  }

  private getTableNameByTag(targetTag: cdk.Tag): string {
    const arnPattern = new RegExp(
      `^arn:aws:dynamodb:${UnitTestClient.getRegion()}:[0-9]+:table/(?<name>.*)`
    );
    const resourceName = UnitTestClient.getResourceNameFromArn(
      this.testResourceTagMappingList,
      targetTag,
      arnPattern
    );
    return resourceName;
  }
}
