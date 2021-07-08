/* eslint-disable no-restricted-syntax */
/* eslint-disable import/no-extraneous-dependencies */
import { SQSEvent } from 'aws-lambda/trigger/sqs';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import S3, { GetObjectRequest } from 'aws-sdk/clients/s3';
import { FileEvent, File, FileHeaderIndex } from '../contracts';
import { FileSectionType } from '../contracts/FileSectionType';

const s3 = new S3();
const documentClient = new DocumentClient();

// eslint-disable-next-line import/prefer-default-export
export const handler = async (event: SQSEvent): Promise<any> => {
  //
  if (process.env.FILE_BUCKET_NAME === undefined)
    throw new Error('process.env.FILE_BUCKET_NAME === undefined');

  if (process.env.HEADERS_TABLE_NAME === undefined)
    throw new Error('process.env.HEADERS_TABLE_NAME === undefined');

  for await (const eventRecord of event.Records) {
    //
    const fileEvent = JSON.parse(eventRecord.body) as FileEvent;

    if (fileEvent.sectionType !== FileSectionType.Header) {
      throw new Error(`Unexpected sectionType: ${JSON.stringify(event)}`);
    }

    // Get the file corresponding to the event

    const getObjectRequest: GetObjectRequest = {
      Bucket: process.env.FILE_BUCKET_NAME,
      Key: fileEvent.s3Key,
    };

    const getObjectOutput = await s3.getObject(getObjectRequest).promise();

    if (getObjectOutput.Body === undefined) {
      throw new Error(`GetObjectOutput.Body is undefined: ${JSON.stringify(getObjectRequest)}`);
    }

    const file = JSON.parse(getObjectOutput.Body.toString('utf-8')) as File<any>;

    // Put the header into the table

    const fileHeaderIndex: FileHeaderIndex = {
      s3Key: fileEvent.s3Key,
      header: file.header,
    };

    await documentClient
      .put({
        TableName: process.env.HEADERS_TABLE_NAME,
        Item: { ...fileHeaderIndex, fileType: file.header.fileType },
      })
      .promise();
  }
};
