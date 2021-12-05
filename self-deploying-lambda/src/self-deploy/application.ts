/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/prefer-default-export */
import EventPublishingFunction from './EventPublishingFunction';
import LoggingFunction from './LoggingFunction';
import SelfDeployTopic from './package/SelfDeployTopic';

const thisFile = __filename;

export const loggingFunction = new LoggingFunction(thisFile, 'LoggingFunction', {});
export const handleLoggingFunction = (event: any): any => loggingFunction.handleEventAsync(event);

export const testTopic = new SelfDeployTopic('TestTopic');

export const eventPublishingFunction = new EventPublishingFunction(
  thisFile,
  'EventPublishingFunction',
  {
    testTopic,
  }
);
export const handleEventPublishingFunction = async (event: any): Promise<any> =>
  eventPublishingFunction.handleEventAsync(event);
