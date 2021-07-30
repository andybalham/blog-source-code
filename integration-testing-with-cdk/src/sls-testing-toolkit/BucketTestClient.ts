/* eslint-disable import/no-extraneous-dependencies */
import AWS from 'aws-sdk';

export default class BucketTestClient {
  //
  private readonly s3: AWS.S3;

  constructor(region: string, private bucketName: string) {
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
}
