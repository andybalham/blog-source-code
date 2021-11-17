import { DynamoDBTestClient } from '@andybalham/sls-testing-toolkit';
import { Key } from 'aws-sdk/clients/dynamodb';

export default class DynamoDBTestClientExt extends DynamoDBTestClient {
  async getItemsByPartitionKeyAsync<T>(keyName: string, keyValue: string): Promise<T[]> {
    if (this.tableName === undefined) throw new Error('this.tableName === undefined');

    const items = new Array<T>();

    let lastEvaluatedKey: Key | undefined;

    do {
      // If we use QueryInput, then we get a 'Condition parameter type does not match schema type'
      const queryParams /*: QueryInput */ = {
        // const queryParams: QueryInput = {
        TableName: this.tableName,
        KeyConditionExpression: `${keyName} = :partitionKey`,
        ExpressionAttributeValues: {
          ':partitionKey': keyValue,
        },
        ExclusiveStartKey: lastEvaluatedKey,
      };

      // eslint-disable-next-line no-await-in-loop
      const queryOutput = await this.db.query(queryParams).promise();

      if (queryOutput.Items) {
        queryOutput.Items.map((i) => i as T).forEach((i) => items.push(i));
      }

      lastEvaluatedKey = queryOutput.LastEvaluatedKey;
      //
    } while (lastEvaluatedKey !== undefined);

    return items;
  }
}
