/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { SNSEvent } from 'aws-lambda/trigger/sns';
// eslint-disable-next-line import/no-extraneous-dependencies
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { nanoid } from 'nanoid';

const integrationTestTableName = process.env.INTEGRATION_TEST_TABLE_NAME;

const documentClient = new DocumentClient();

export const handler = async (event: SNSEvent): Promise<void> => {
  //
  console.log(JSON.stringify(event));

  if (integrationTestTableName === undefined)
    throw new Error('integrationTestTableName === undefined');

  const testOutputItem = {
    PK: 'TestId', // TODO 02Jul21: Get the current TestId from the table
    SK: `TestOutput-${nanoid()}`, // TODO 02Jul21: Add a time element for rough ordering?
    event,
  };

  await documentClient
    .put({
      TableName: integrationTestTableName,
      Item: testOutputItem,
    })
    .promise();
};
