import * as cdk from '@aws-cdk/core';
import { ResourceTagMappingList } from 'aws-sdk/clients/resourcegroupstaggingapi';
import dotenv from 'dotenv';
import AWS from 'aws-sdk';

dotenv.config();

export function getRegion(): string {
  return process.env.AWS_REGION ?? 'undefined';
}

const s3 = new AWS.S3({ region: getRegion() });
const dynamodb = new AWS.DynamoDB({ region: getRegion() });
const tagging = new AWS.ResourceGroupsTaggingAPI({ region: getRegion() });

export async function getResourcesByTagKeyAsync(key: string): Promise<ResourceTagMappingList> {
  // TODO 27Jun21: PaginationToken
  const resources = await tagging
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

export async function uploadObjectToBucketAsync(
  bucketName: string,
  key: string,
  object: Record<string, any>
): Promise<void> {
  await s3
    .upload({
      Bucket: bucketName,
      Key: key,
      Body: JSON.stringify(object),
    })
    .promise();
}

export function getTimedOut(timeoutSeconds: number): () => boolean {
  const timeOutThreshold = Date.now() + 1000 * timeoutSeconds;
  const timedOut = (): boolean => Date.now() > timeOutThreshold;
  return timedOut;
}

export async function waitAsync(waitSeconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
}

export function getResourceArnByTag(resources: ResourceTagMappingList, targetTag: cdk.Tag): string {
  //
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

function getResourceNameFromArn(
  resources: ResourceTagMappingList,
  targetTag: cdk.Tag,
  arnPattern: RegExp
): string {
  const tagMatchArn = getResourceArnByTag(resources, targetTag);

  const bucketArnMatch = tagMatchArn.match(arnPattern);

  if (!bucketArnMatch || !bucketArnMatch.groups?.name) {
    throw new Error(`ARN did not match expected pattern: ${tagMatchArn}`);
  }

  const bucketName = bucketArnMatch.groups.name;
  return bucketName;
}

export function getBucketNameByTag(resources: ResourceTagMappingList, targetTag: cdk.Tag): string {
  const arnPattern = /^arn:aws:s3:::(?<name>.*)/;
  const resourceName = getResourceNameFromArn(resources, targetTag, arnPattern);
  return resourceName;
}

export function getTableNameByTag(resources: ResourceTagMappingList, targetTag: cdk.Tag): string {
  const arnPattern = new RegExp(`^arn:aws:dynamodb:${getRegion()}:[0-9]+:table/(?<name>.*)`);
  const resourceName = getResourceNameFromArn(resources, targetTag, arnPattern);
  return resourceName;
}
