/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { SNSEvent } from 'aws-lambda/trigger/sns';
import { DateTime } from 'luxon';

export const HIGH_PRIORITY_THRESHOLD_DAYS = 'HIGH_PRIORITY_THRESHOLD_DAYS';
export const OVERRIDE_NOW = 'OVERRIDE_NOW';

export const handler = async (event: SNSEvent): Promise<void> => {
  //
  console.log(JSON.stringify({ event }, null, 2));

  for await (const record of event.Records) {
    //
    console.log(JSON.stringify({ messageAttributes: record.Sns.MessageAttributes }, null, 2));

    const deadlineString = record.Sns.MessageAttributes.Deadline.Value as string;

    console.log(JSON.stringify({ deadlineString }, null, 2));

    const isHighPriority = evaluatePriority(deadlineString);

    console.log(JSON.stringify({ isHighPriority }, null, 2));
  }
};

function evaluatePriority(deadlineString: string): boolean {
  if (!deadlineString) {
    return false;
  }

  const deadlineDate = DateTime.fromISO(deadlineString);

  console.log(JSON.stringify({ deadlineDate }, null, 2));

  if (!deadlineDate.isValid) {
    return false;
  }

  const now = getNow();

  console.log(JSON.stringify({ now }, null, 2));

  const durationLeft = deadlineDate.diff(now, 'days');

  console.log(JSON.stringify({ durationLeft }, null, 2));

  const highPriorityThresholdDays = parseInt(process.env[HIGH_PRIORITY_THRESHOLD_DAYS] ?? '0', 10);

  console.log(JSON.stringify({ highPriorityThresholdDays }, null, 2));
  
  return durationLeft.days <= highPriorityThresholdDays;
}

function getNow(): DateTime {
  if (process.env[OVERRIDE_NOW]) {
    return DateTime.fromISO(process.env[OVERRIDE_NOW] ?? '');
  }
  return DateTime.now();
}
