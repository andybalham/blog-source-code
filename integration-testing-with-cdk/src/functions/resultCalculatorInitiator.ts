/* eslint-disable no-restricted-syntax */
/* eslint-disable import/no-extraneous-dependencies */
import AWS from 'aws-sdk';
import { SQSEvent } from 'aws-lambda/trigger/sqs';
import { StartExecutionInput } from 'aws-sdk/clients/stepfunctions';
import { FileEvent } from '../contracts';
import { FileSectionType } from '../contracts/FileSectionType';

const stateMachineArn = process.env.STATE_MACHINE_ARN;
const stepFunctions = new AWS.StepFunctions();

// eslint-disable-next-line import/prefer-default-export
export const handler = async (event: SQSEvent): Promise<void> => {
  //
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ event }, null, 2));

  if (stateMachineArn === undefined) throw new Error('stateMachineArn === undefined');

  for await (const eventRecord of event.Records) {
    //
    const fileEvent = JSON.parse(eventRecord.body) as FileEvent;

    if (fileEvent.sectionType !== FileSectionType.Body) {
      throw new Error(`Unexpected sectionType: ${JSON.stringify(event)}`);
    }

    const params: StartExecutionInput = {
      stateMachineArn,
      input: JSON.stringify({ fileEvent }),
    };

    await stepFunctions.startExecution(params).promise();
  }
};
