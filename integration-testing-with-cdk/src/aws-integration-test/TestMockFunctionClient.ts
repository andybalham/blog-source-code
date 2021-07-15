// eslint-disable-next-line import/no-extraneous-dependencies
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { nanoid } from 'nanoid';
import { CurrentTestItem, MockStateTestItem, OutputTestItem, TestItemPrefix } from './TestItem';

const documentClient = new DocumentClient();

export default class TestMockFunctionClient {
  //
  constructor(private integrationTestTableName: string | undefined) {}

  async getCurrentTestAsync<T>(): Promise<{ testId: string; inputs?: T }> {
    //
    if (this.integrationTestTableName === undefined)
      throw new Error('this.integrationTestTableName === undefined');

    const testQueryParams /*: QueryInput */ = {
      // QueryInput results in a 'Condition parameter type does not match schema type'
      TableName: this.integrationTestTableName,
      KeyConditionExpression: `PK = :PK`,
      ExpressionAttributeValues: {
        ':PK': 'Current',
      },
    };

    const testQueryOutput = await documentClient.query(testQueryParams).promise();

    if (testQueryOutput.Items === undefined) throw new Error('testQueryOutput.Items === undefined');
    if (testQueryOutput.Items.length !== 1) throw new Error('testQueryOutput.Items.length !== 1');

    const currentTestItem = testQueryOutput.Items[0] as CurrentTestItem<T>;

    return { testId: currentTestItem.testId, inputs: currentTestItem.inputs };
  }

  async setTestOutputAsync<T>(output: T): Promise<void> {
    //
    if (this.integrationTestTableName === undefined)
      throw new Error('this.integrationTestTableName === undefined');

    const { testId } = await this.getCurrentTestAsync();

    const testOutputItem: OutputTestItem<T> = {
      PK: testId,
      // TODO 02Jul21: Add a time element for rough ordering?
      SK: `${TestItemPrefix.TestOutput}-${nanoid()}`,
      output,
    };

    await documentClient
      .put({
        TableName: this.integrationTestTableName,
        Item: testOutputItem,
      })
      .promise();
  }

  async getMockStateAsync<T>(mockId: string, defaultState: T): Promise<T> {
    //
    if (this.integrationTestTableName === undefined)
      throw new Error('this.integrationTestTableName === undefined');

    const { testId } = await this.getCurrentTestAsync();

    const mockStateQueryParams /*: QueryInput */ = {
      // QueryInput results in a 'Condition parameter type does not match schema type'
      TableName: this.integrationTestTableName,
      KeyConditionExpression: `PK = :PK and SK = :SK`,
      ExpressionAttributeValues: {
        ':PK': testId,
        ':SK': `${TestItemPrefix.MockState}-${mockId}`,
      },
    };

    const mockStateQueryOutput = await documentClient.query(mockStateQueryParams).promise();

    if (mockStateQueryOutput.Items === undefined || mockStateQueryOutput.Items.length === 0) {
      return defaultState;
    }

    if (mockStateQueryOutput.Items.length > 1)
      throw new Error('mockStateQueryOutput.Items.length > 1');

    const mockState = mockStateQueryOutput.Items[0].state;

    return mockState;
  }

  async setMockStateAsync<T>(mockId: string, state: T): Promise<void> {
    //
    if (this.integrationTestTableName === undefined)
      throw new Error('this.integrationTestTableName === undefined');

    const { testId } = await this.getCurrentTestAsync();

    const mockStateItem: MockStateTestItem<T> = {
      PK: testId,
      SK: `${TestItemPrefix.MockState}-${mockId}`,
      state,
    };

    await documentClient
      .put({
        TableName: this.integrationTestTableName,
        Item: mockStateItem,
      })
      .promise();
  }
}
