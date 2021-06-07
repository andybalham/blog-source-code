/* eslint-disable import/prefer-default-export */
import { S3Event } from 'aws-lambda/trigger/s3';
// eslint-disable-next-line import/no-extraneous-dependencies
import S3, { GetObjectRequest } from 'aws-sdk/clients/s3';
import hash from 'object-hash';
// eslint-disable-next-line import/no-extraneous-dependencies
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { File } from '../contracts/File';
import { FileHash } from '../contracts/FileHash';
import { FileSectionType } from '../contracts/FileSectionType';

const fileHashesTableName = process.env.FILE_HASHES_TABLE_NAME;

const documentClient = new DocumentClient();
const s3 = new S3();

export const handler = async (event: S3Event): Promise<void> => {
  //
  if (fileHashesTableName === undefined) throw new Error('fileHashesTableName === undefined');

  const eventS3 = event.Records[0].s3; // In production, we would need to consider multiple records

  const getObjectRequest: GetObjectRequest = {
    Bucket: eventS3.bucket.name,
    Key: eventS3.object.key,
  };

  const getObjectOutput = await s3.getObject(getObjectRequest).promise();

  if (getObjectOutput.Body === undefined) {
    throw new Error(`GetObjectOutput.Body is undefined: ${JSON.stringify(getObjectRequest)}`);
  }

  const file = JSON.parse(getObjectOutput.Body.toString('utf-8')) as File<any>;

  const headerHashItem: FileHash = {
    s3Key: eventS3.object.key,
    fileType: file.header.fileType,
    sectionType: FileSectionType.Header,
    sectionHash: hash(file.header),
  };

  await documentClient
    .put({
      TableName: fileHashesTableName,
      Item: headerHashItem,
    })
    .promise();

  const bodyHashItem: FileHash = {
    s3Key: eventS3.object.key,
    fileType: file.header.fileType,
    sectionType: FileSectionType.Body,
    sectionHash: hash(file.body),
  };

  await documentClient
    .put({
      TableName: fileHashesTableName,
      Item: bodyHashItem,
    })
    .promise();
};
