/* eslint-disable no-restricted-syntax */
/* eslint-disable import/no-extraneous-dependencies */
import S3, { GetObjectRequest } from 'aws-sdk/clients/s3';
import { FileEvent, File, FileHeader } from '../contracts';

const fileBucketName = process.env.FILE_BUCKET_NAME;
const s3 = new S3();

// eslint-disable-next-line import/prefer-default-export
export const handler = async (event: FileEvent): Promise<FileHeader> => {
  //
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ event }, null, 2));

  if (fileBucketName === undefined) throw new Error('fileBucketName === undefined');

  const getObjectRequest: GetObjectRequest = {
    Bucket: fileBucketName,
    Key: event.s3Key,
  };

  const getObjectOutput = await s3.getObject(getObjectRequest).promise();

  if (getObjectOutput.Body === undefined) {
    throw new Error(`GetObjectOutput.Body is undefined: ${JSON.stringify(getObjectRequest)}`);
  }

  const file = JSON.parse(getObjectOutput.Body.toString('utf-8')) as File<any>;

  return file.header;
};
