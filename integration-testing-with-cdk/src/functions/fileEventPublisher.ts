/* eslint-disable import/prefer-default-export */
import { DynamoDBStreamEvent } from 'aws-lambda/trigger/dynamodb-stream';
// eslint-disable-next-line import/no-extraneous-dependencies
import DynamoDB from 'aws-sdk/clients/dynamodb';
// eslint-disable-next-line import/no-extraneous-dependencies
import SNS from 'aws-sdk/clients/sns';
import { FileEvent, FileEventType } from '../contracts/FileEvent';
import { FileHash } from '../contracts/FileHash';
import { FileSectionType } from '../contracts/FileSectionType';

const fileEventTopicArn = process.env.FILE_EVENT_TOPIC_ARN;

const sns = new SNS();

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  //
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(event));

  if (fileEventTopicArn === undefined) throw new Error('fileEventTopicArn === undefined');

  for (let index = 0; index < event.Records.length; index += 1) {
    //
    const record = event.Records[index];

    if (
      record.eventName !== undefined &&
      record.dynamodb !== undefined &&
      record.dynamodb?.Keys !== undefined
    ) {
      const oldHash =
        record.dynamodb.OldImage === undefined
          ? undefined
          : (DynamoDB.Converter.unmarshall(record.dynamodb.OldImage) as FileHash);

      const newHash =
        record.dynamodb.NewImage === undefined
          ? undefined
          : (DynamoDB.Converter.unmarshall(record.dynamodb.NewImage) as FileHash);

      if (newHash?.sectionHash === oldHash?.sectionHash) {
        return;
      }

      //
      let eventType: FileEventType;
      let s3Key: string;
      let sectionType: FileSectionType;

      if (newHash?.sectionHash) {
        eventType = oldHash?.sectionHash ? FileEventType.Updated : FileEventType.Created;
        s3Key = newHash.s3Key;
        sectionType = newHash.sectionType;
      } else {
        throw new Error(`No new hash`);
      }

      const fileEvent = new FileEvent(eventType, sectionType, s3Key);

      const publishInput = {
        Message: JSON.stringify(fileEvent),
        TopicArn: fileEventTopicArn,
        MessageAttributes: fileEvent.messageAttributes,
      };

      // eslint-disable-next-line no-await-in-loop
      await sns.publish(publishInput).promise();
    }
  }
};
