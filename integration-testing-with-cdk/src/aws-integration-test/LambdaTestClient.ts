// eslint-disable-next-line import/no-extraneous-dependencies
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { nanoid } from 'nanoid';
import { CurrentTestItem, OutputTestItem, TestItemPrefix } from './TestItem';

const documentClient = new DocumentClient();

export default class LambdaTestClient {
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

  // eslint-disable-next-line class-methods-use-this
  async getMockStateAsync<T>(mockId: string): Promise<T> {
    throw new Error(`errorMessage`);
  }

  // eslint-disable-next-line class-methods-use-this
  async setMockStateAsync<T>(mockId: string, state: T): Promise<void> {
    throw new Error(`errorMessage`);
  }
}
