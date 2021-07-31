/* eslint-disable import/no-extraneous-dependencies */
import AWS from 'aws-sdk';
import { clearAllObjects } from './s3';

export default class BucketTestClient {
  //
  private readonly s3: AWS.S3;

  constructor(private region: string, private bucketName: string) {
    this.s3 = new AWS.S3({ region });
  }

  async uploadObjectAsync(key: string, object: Record<string, any>): Promise<void> {
    //
    await this.s3
      .upload({
        Bucket: this.bucketName,
        Key: key,
        Body: JSON.stringify(object),
      })
      .promise();
  }

  async clearAllObjectsAsync(prefix?: string): Promise<void> {
    // TODO 31Jul21: Refactor the method below
    await clearAllObjects(this.region, this.bucketName, prefix);
  }
}
