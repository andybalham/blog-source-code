/* eslint-disable import/no-extraneous-dependencies */
import { ResourceTagMappingList } from 'aws-sdk/clients/resourcegroupstaggingapi';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import * as cdk from '@aws-cdk/core';

dotenv.config();

export interface IntegrationTestClientProps {
  testResourceTagKey: string;
}

export default class IntegrationTestClient {
  //
  static readonly tagging = new AWS.ResourceGroupsTaggingAPI({
    region: IntegrationTestClient.getRegion(),
  });

  static readonly s3 = new AWS.S3({ region: IntegrationTestClient.getRegion() });

  static getRegion(): string {
    if (process.env.AWS_REGION === undefined)
      throw new Error('process.env.AWS_REGION === undefined');
    return process.env.AWS_REGION;
  }

  static async getResourcesByTagKeyAsync(key: string): Promise<ResourceTagMappingList> {
    // TODO 27Jun21: PaginationToken
    const resources = await IntegrationTestClient.tagging
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

  testResourceTagMappingList: ResourceTagMappingList;

  constructor(private props: IntegrationTestClientProps) {}

  async initialiseAsync(): Promise<void> {
    this.testResourceTagMappingList = await IntegrationTestClient.getResourcesByTagKeyAsync(
      this.props.testResourceTagKey
    );
  }

  private static getResourceArnByTag(resources: ResourceTagMappingList, targetTag: cdk.Tag): string {
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
    const tagMatchArn = IntegrationTestClient.getResourceArnByTag(resources, targetTag);

    const bucketArnMatch = tagMatchArn.match(arnPattern);

    if (!bucketArnMatch || !bucketArnMatch.groups?.name) {
      throw new Error(`ARN did not match expected pattern: ${tagMatchArn}`);
    }

    const bucketName = bucketArnMatch.groups.name;
    return bucketName;
  }

  private getBucketNameByTag(targetTag: cdk.Tag): string {
    const arnPattern = /^arn:aws:s3:::(?<name>.*)/;
    const resourceName = IntegrationTestClient.getResourceNameFromArn(
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

    await IntegrationTestClient.s3
      .upload({
        Bucket: bucketName,
        Key: key,
        Body: JSON.stringify(object),
      })
      .promise();
  }

  // ------------------------------------------------------------------------------------------------

  // eslint-disable-next-line class-methods-use-this
  async beginTest<T>(testId: string, inputs?: T): Promise<void> {
    throw new Error(`errorMessage`);
  }

  // eslint-disable-next-line class-methods-use-this
  async getCurrentTest<T>(): Promise<{ testId: string; inputs?: T }> {
    throw new Error(`errorMessage`);
  }

  // eslint-disable-next-line class-methods-use-this
  async getMockState<T>(mockId: string): Promise<T> {
    throw new Error(`errorMessage`);
  }

  // eslint-disable-next-line class-methods-use-this
  async setMockState<T>(mockId: string, state: T): Promise<void> {
    throw new Error(`errorMessage`);
  }

  // eslint-disable-next-line class-methods-use-this
  async setTestOutput<T>(outputId: string, output?: T): Promise<void> {
    throw new Error(`errorMessage`);
  }

  // eslint-disable-next-line class-methods-use-this
  async getTestOutputs<T>(): Promise<T[]> {
    throw new Error(`errorMessage`);
  }
}
