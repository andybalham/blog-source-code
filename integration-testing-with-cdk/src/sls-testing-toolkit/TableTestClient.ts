/* eslint-disable import/no-extraneous-dependencies */
import { clearAllItems } from './dynamoDb';

export default class BucketTestClient {
  //
  constructor(private region: string, private tableName: string) {}

  async clearAllItemsAsync(): Promise<void> {
    await clearAllItems(this.region, this.tableName);
  }
}
