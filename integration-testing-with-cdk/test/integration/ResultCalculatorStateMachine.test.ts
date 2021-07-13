import { UnitTestClient } from '../../src/aws-integration-test';
import { ResultCalculatorStateMachineTestStack } from '../../src/cdk/stacks/test';
import { FileEvent, FileEventType } from '../../src/contracts';
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
    await testClient.startStateMachineAsync(
      ResultCalculatorStateMachineTestStack.StateMachineId,
      new FileEvent(FileEventType.Created, FileSectionType.Body, 'S3Key')
    );
  });
});
