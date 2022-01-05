/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/prefer-default-export */
import EventPublishingFunction from './EventPublishingFunction';
import ItemPutterFunction from './ItemPutterFunction';
import LoggingFunction from './LoggingFunction';
import SelfDeployTopic from './package/SelfDeployTopic';
import TestTable from './TestTable';

const thisFile = __filename;

export const loggingFunction = new LoggingFunction(thisFile, 'LoggingFunction', {});

export const testTopic = new SelfDeployTopic('TestTopic');
export const eventPublishingFunction = new EventPublishingFunction(
  thisFile,
  'EventPublishingFunction',
  {
    testTopic,
  }
);

export const testTable = new TestTable('TestTable');
export const itemPutterFunction = new ItemPutterFunction(thisFile, 'ItemPutterFunction', {
  testTableWriter: testTable.getWriter(),
});

// Function entry points

export const handleLoggingFunction = async (event: any): Promise<any> =>
  loggingFunction.handleEventAsync(event);
export const handleEventPublishingFunction = async (event: any): Promise<any> =>
  eventPublishingFunction.handleEventAsync(event);
export const handleItemPutterFunction = async (event: any): Promise<any> =>
  itemPutterFunction.handleEventAsync(event);
