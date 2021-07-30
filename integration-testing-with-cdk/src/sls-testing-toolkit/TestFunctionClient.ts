/* eslint-disable class-methods-use-this */
// eslint-disable-next-line import/no-extraneous-dependencies
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { nanoid } from 'nanoid';
import MockInvocation from './MockInvocation';
import { CurrentTestItem, InvocationTestItem, MockStateTestItem, ObservationTestItem, TestItemPrefix } from './TestItem';
import TestObservation from './TestObservation';
import { TestProps } from "./TestProps";

const integrationTestTableName = process.env.INTEGRATION_TEST_TABLE_NAME;

const documentClient = new DocumentClient();

export default class TestFunctionClient {
  //
  async getTestPropsAsync(): Promise<TestProps> {
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

    const currentTestItem = testQueryOutput.Items[0] as CurrentTestItem;

    return currentTestItem.props;
  }

  async recordObservationAsync(observation: TestObservation): Promise<void> {
    //
    if (integrationTestTableName === undefined)
      throw new Error('integrationTestTableName === undefined');

    const { testId } = await this.getTestPropsAsync();

    const now = Date.now().toString().slice(6);

    const testOutputItem: ObservationTestItem = {
      PK: testId,
      SK: `${TestItemPrefix.TestObservation}-${now}-${nanoid(10)}`,
      observation,
    };

    await documentClient
      .put({
        TableName: integrationTestTableName,
        Item: testOutputItem,
      })
      .promise();
  }

  async recordInvocationAsync(invocation: MockInvocation): Promise<void> {
    //
    if (integrationTestTableName === undefined)
      throw new Error('integrationTestTableName === undefined');

    const { testId } = await this.getTestPropsAsync();

    const now = Date.now().toString().slice(6);

    const testOutputItem: InvocationTestItem = {
      PK: testId,
      SK: `${TestItemPrefix.MockInvocation}-${now}-${nanoid(10)}`,
      invocation,
    };

    await documentClient
      .put({
        TableName: integrationTestTableName,
        Item: testOutputItem,
      })
      .promise();
  }

  async getMockStateAsync(mockId: string, initialState: Record<string, any>): Promise<Record<string, any>> {
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
      return initialState;
    }

    if (mockStateQueryOutput.Items.length > 1)
      throw new Error('mockStateQueryOutput.Items.length > 1');

    const mockState = mockStateQueryOutput.Items[0].state;

    return mockState;
  }

  async setMockStateAsync(mockId: string, state: Record<string, any>): Promise<void> {
    //
    if (integrationTestTableName === undefined)
      throw new Error('integrationTestTableName === undefined');

    const { testId } = await this.getTestPropsAsync();

    const mockStateItem: MockStateTestItem = {
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
