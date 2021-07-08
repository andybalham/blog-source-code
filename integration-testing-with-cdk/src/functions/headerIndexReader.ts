/* eslint-disable import/no-extraneous-dependencies */
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { FileHeaderIndex, FileTypeCriteria } from '../contracts';

const documentClient = new DocumentClient();

// eslint-disable-next-line import/prefer-default-export
export const handler = async (criteria: FileTypeCriteria): Promise<FileHeaderIndex[]> => {
  //
  if (process.env.HEADERS_TABLE_NAME === undefined)
    throw new Error('process.env.HEADERS_TABLE_NAME === undefined');

  const queryParams /*: QueryInput */ = {
    // QueryInput results in a 'Condition parameter type does not match schema type'
    TableName: process.env.HEADERS_TABLE_NAME,
    KeyConditionExpression: `fileType = :fileType`,
    ExpressionAttributeValues: {
      ':fileType': criteria.fileType,
    },
  };

  const queryOutput = await documentClient.query(queryParams).promise();

  if (queryOutput.Items === undefined) throw new Error('queryOutput.Items === undefined');

  const fileHeaderIndexes = queryOutput.Items.map((i) => ({ s3Key: i.s3Key, header: i.header }));

  return fileHeaderIndexes;
};
