/* eslint-disable import/no-extraneous-dependencies */
import { ResourceTagMappingList } from 'aws-sdk/clients/resourcegroupstaggingapi';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import * as cdk from '@aws-cdk/core';

dotenv.config();

export interface UnitTestClientProps {
  testResourceTagKey: string;
}

export default class UnitTestClient {
  //
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
      outputs = await this.getTestOutputs<T>();
    }

    return {
      timedOut: !until(outputs),
      outputs,
    };
  }

  // eslint-disable-next-line class-methods-use-this
  async getTestOutputs<T>(): Promise<T[]> {
    // TODO 02Jul21: Read the outputs from the table
    return [];
  }

  static async sleepAsync(seconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  //
  static readonly tagging = new AWS.ResourceGroupsTaggingAPI({
    region: UnitTestClient.getRegion(),
  });

  static readonly s3 = new AWS.S3({ region: UnitTestClient.getRegion() });

  static getRegion(): string {
    if (process.env.AWS_REGION === undefined)
      throw new Error('process.env.AWS_REGION === undefined');
    return process.env.AWS_REGION;
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

  static async sleepSecondsAsync(seconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  testResourceTagMappingList: ResourceTagMappingList;

  constructor(private props: UnitTestClientProps) {}

  async initialiseAsync(): Promise<void> {
    this.testResourceTagMappingList = await UnitTestClient.getResourcesByTagKeyAsync(
      this.props.testResourceTagKey
    );
  }

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

  // ------------------------------------------------------------------------------------------------

  // eslint-disable-next-line class-methods-use-this
  async beginTestAsync<T>(testId: string, inputs?: T): Promise<void> {
    if (!testId) {
      throw new Error(`A testId must be specified`);
    }

    // TODO 02Jul21: Clear down all inputs, outputs, and mock states for the test

    // TODO 02Jul21: Set the current test and inputs
  }

  // eslint-disable-next-line class-methods-use-this
  async getCurrentTestAsync<T>(): Promise<{ testId: string; inputs?: T }> {
    throw new Error(`errorMessage`);
  }

  // eslint-disable-next-line class-methods-use-this
  async getMockStateAsync<T>(mockId: string): Promise<T> {
    throw new Error(`errorMessage`);
  }

  // eslint-disable-next-line class-methods-use-this
  async setMockStateAsync<T>(mockId: string, state: T): Promise<void> {
    throw new Error(`errorMessage`);
  }

  // eslint-disable-next-line class-methods-use-this
  async setTestOutputAsync<T>(outputId: string, output?: T): Promise<void> {
    throw new Error(`errorMessage`);
  }

  // eslint-disable-next-line class-methods-use-this
  async getTestOutputsAsync<T>(): Promise<T[]> {
    throw new Error(`errorMessage`);
  }
}
