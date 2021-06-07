/* eslint-disable import/prefer-default-export */
import { DynamoDBStreamEvent } from 'aws-lambda/trigger/dynamodb-stream';
// eslint-disable-next-line import/no-extraneous-dependencies
import DynamoDB from 'aws-sdk/clients/dynamodb';
// eslint-disable-next-line import/no-extraneous-dependencies
import SNS, { PublishInput } from 'aws-sdk/clients/sns';
import { FileEvent, FileEventType } from '../contracts/FileEvent';
import { FileHash } from '../contracts/FileHash';

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

      let publishInput: PublishInput;

      if (newHash?.sectionHash !== oldHash?.sectionHash) {
        //
        if (newHash?.sectionHash && oldHash?.sectionHash) {
          //
          const fileEvent: FileEvent = {
            eventType: FileEventType.Updated,
            s3Key: newHash.s3Key,
            sectionType: newHash.sectionType,
          };

          publishInput = {
            Message: JSON.stringify(fileEvent),
            TopicArn: fileEventTopicArn,
            // MessageAttributes: SNS.getMessageAttributeMap(attributes),
          };
        } else if (newHash?.sectionHash) {
          //
          const fileEvent: FileEvent = {
            eventType: FileEventType.Created,
            s3Key: newHash.s3Key,
            sectionType: newHash.sectionType,
          };

          publishInput = {
            Message: JSON.stringify(fileEvent),
            TopicArn: fileEventTopicArn,
            // MessageAttributes: SNS.getMessageAttributeMap(attributes),
          };
        } else if (oldHash?.sectionHash) {
          //
          const fileEvent: FileEvent = {
            eventType: FileEventType.Deleted,
            s3Key: oldHash.s3Key,
            sectionType: oldHash.sectionType,
          };

          publishInput = {
            Message: JSON.stringify(fileEvent),
            TopicArn: fileEventTopicArn,
            // MessageAttributes: SNS.getMessageAttributeMap(attributes),
          };
        } else {
          throw new Error(`No hashes`);
        }

        // eslint-disable-next-line no-await-in-loop
        await sns.publish(publishInput).promise();
      }
    }
  }
};
