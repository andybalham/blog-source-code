/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { SNSEvent } from 'aws-lambda/trigger/sns';
// eslint-disable-next-line import/no-extraneous-dependencies
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { FileEvent } from '../contracts/FileEvent';

const testResultsTableName = process.env.TEST_RESULTS_TABLE_NAME;

const documentClient = new DocumentClient();

export const handler = async (event: SNSEvent): Promise<void> => {
  //
  console.log(JSON.stringify(event));

  if (testResultsTableName === undefined) throw new Error('testResultsTableName === undefined');

  for (let index = 0; index < event.Records.length; index += 1) {
    //
    const recordSns = event.Records[index].Sns;
    const fileEvent = JSON.parse(recordSns.Message) as FileEvent;

    const testResultItem = {
      s3Key: fileEvent.s3Key,
      messageId: recordSns.MessageId,
      message: fileEvent,
    };

    // eslint-disable-next-line no-await-in-loop
    await documentClient
      .put({
        TableName: testResultsTableName,
        Item: testResultItem,
      })
      .promise();
  }
};
