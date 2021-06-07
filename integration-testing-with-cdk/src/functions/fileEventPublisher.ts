/* eslint-disable import/prefer-default-export */
import { DynamoDBStreamEvent } from 'aws-lambda/trigger/dynamodb-stream';
// eslint-disable-next-line import/no-extraneous-dependencies
import DynamoDB from 'aws-sdk/clients/dynamodb';
// eslint-disable-next-line import/no-extraneous-dependencies
import SNS, { PublishInput } from 'aws-sdk/clients/sns';
import { FileEvent, FileEventType } from '../contracts/FileEvent';
import { FileHash } from '../contracts/FileHash';
import { FileSectionType } from '../contracts/FileSectionType';

const fileEventTopicArn = process.env.FILE_EVENT_TOPIC_ARN;

const sns = new SNS();

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  //
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
      } else if (oldHash?.sectionHash) {
        eventType = FileEventType.Deleted;
        s3Key = oldHash.s3Key;
        sectionType = oldHash.sectionType;
      } else {
        throw new Error(`No hashes`);
      }

      const fileEvent: FileEvent = {
        eventType,
        s3Key,
        sectionType,
      };

      const publishInput = {
        Message: JSON.stringify(fileEvent),
        TopicArn: fileEventTopicArn,
        MessageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: eventType,
          },
          sectionType: {
            DataType: 'String',
            StringValue: sectionType,
          },
        },
      };

      // eslint-disable-next-line no-await-in-loop
      await sns.publish(publishInput).promise();
    }
  }
};
