import { nanoid } from 'nanoid';
import { UnitTestClient } from '../../src/aws-integration-test';
import { ResultCalculatorStateMachineTestStack } from '../../src/cdk/stacks/test';
import { FileEvent, FileEventType, FileHeader, FileType } from '../../src/contracts';
import { FileSectionType } from '../../src/contracts/FileSectionType';

describe('ResultCalculatorStateMachine Tests', () => {
  const testClient = new UnitTestClient({
    testResourceTagKey: ResultCalculatorStateMachineTestStack.ResourceTagKey,
  });

  before(async () => {
    await testClient.initialiseClientAsync();
  });

  beforeEach(async () => {
    // TODO 08Jul21: Clear down test bucket and underlying table?
  });

  it('Simple invocation', async () => {
    //
    const fileEvent = new FileEvent(FileEventType.Created, FileSectionType.Body, nanoid());

    const fileHeader: FileHeader = {
      fileType: FileType.Configuration,
      name: nanoid(),
    };

    await testClient.initialiseTestAsync('Simple invocation', {
      mocks: {
        [ResultCalculatorStateMachineTestStack.FileHeaderReaderMockId]: [{ response: fileHeader }],
      },
    });

    await testClient.startStateMachineAsync(ResultCalculatorStateMachineTestStack.StateMachineId, {
      fileEvent,
    });
  });
});
