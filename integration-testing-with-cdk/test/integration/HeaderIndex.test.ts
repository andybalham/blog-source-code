/* eslint-disable @typescript-eslint/no-unused-expressions */
import { nanoid } from 'nanoid';
import { UnitTestClient } from '../../src/aws-integration-test';
import { HeaderIndexTestStack } from '../../src/cdk/stacks/test';
import { FileEvent, FileEventType } from '../../src/contracts/FileEvent';
import { FileSectionType } from '../../src/contracts/FileSectionType';

describe('HeaderIndex Tests', () => {
  const testClient = new UnitTestClient({
    testResourceTagKey: HeaderIndexTestStack.ResourceTagKey,
  });

  before(async () => {
    await testClient.initialiseAsync();
  });

  it('Header created', async () => {
    // Arrange

    await testClient.beginTestAsync('Header created');

    const fileEvent = new FileEvent(FileEventType.Created, FileSectionType.Header, nanoid());

    // Act

    await testClient.publishMessageAsync(
      HeaderIndexTestStack.TestFileEventTopicId,
      fileEvent,
      fileEvent.messageAttributes
    );

    // Assert

    // TODO 04Jul21: Invoke the function
  });
});
