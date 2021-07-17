/* eslint-disable class-methods-use-this */
// eslint-disable-next-line import/no-extraneous-dependencies
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { nanoid } from 'nanoid';
import { CurrentTestItem, MockStateTestItem, OutputTestItem, TestItemPrefix } from './TestItem';
import { TestProps } from './UnitTestClient';

const integrationTestTableName = process.env.INTEGRATION_TEST_TABLE_NAME;

const documentClient = new DocumentClient();

export default class TestFunctionClient {
  //
  async getTestPropsAsync<T>(): Promise<TestProps<T>> {
    //
    if (integrationTestTableName === undefined)
      throw new Error('integrationTestTableName === undefined');

    const testQueryParams /*: QueryInput */ = {
      // QueryInput results in a 'Condition parameter type does not match schema type'
      TableName: integrationTestTableName,
      KeyConditionExpression: `PK = :PK`,
      ExpressionAttributeValues: {
        ':PK': 'Current',
      },
    };

    const testQueryOutput = await documentClient.query(testQueryParams).promise();

    if (testQueryOutput.Items === undefined) throw new Error('testQueryOutput.Items === undefined');
    if (testQueryOutput.Items.length !== 1) throw new Error('testQueryOutput.Items.length !== 1');

    const currentTestItem = testQueryOutput.Items[0] as CurrentTestItem<T>;

    return currentTestItem;
  }

  async setTestOutputAsync<T>(output: T): Promise<void> {
    //
    if (integrationTestTableName === undefined)
      throw new Error('integrationTestTableName === undefined');

    const { testId } = await this.getTestPropsAsync();

    const now = Date.now().toString().slice(6);

    const testOutputItem: OutputTestItem<T> = {
      PK: testId,
      SK: `${TestItemPrefix.TestOutput}-${now}-${nanoid(10)}`,
      output,
    };

    await documentClient
      .put({
        TableName: integrationTestTableName,
        Item: testOutputItem,
      })
      .promise();
  }

  async getMockStateAsync<T>(mockId: string, defaultState: T): Promise<T> {
    //
    if (integrationTestTableName === undefined)
      throw new Error('integrationTestTableName === undefined');

    const { testId } = await this.getTestPropsAsync();

    const mockStateQueryParams /*: QueryInput */ = {
      // QueryInput results in a 'Condition parameter type does not match schema type'
      TableName: integrationTestTableName,
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
    if (integrationTestTableName === undefined)
      throw new Error('integrationTestTableName === undefined');

    const { testId } = await this.getTestPropsAsync();

    const mockStateItem: MockStateTestItem<T> = {
      PK: testId,
      SK: `${TestItemPrefix.MockState}-${mockId}`,
      state,
    };

    await documentClient
      .put({
        TableName: integrationTestTableName,
        Item: mockStateItem,
      })
      .promise();
  }
}
