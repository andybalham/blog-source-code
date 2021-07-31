/* eslint-disable import/no-extraneous-dependencies */
import { clearAllItems } from './dynamoDb';

export default class BucketTestClient {
  //
  constructor(private region: string, private tableName: string) {}

  async clearAllItemsAsync(): Promise<void> {
    // TODO 31Jul21: Refactor the method below
    await clearAllItems(this.region, this.tableName);
  }
}
