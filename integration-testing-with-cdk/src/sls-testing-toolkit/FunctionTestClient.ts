/* eslint-disable import/no-extraneous-dependencies */
import AWS from 'aws-sdk';

export default class FunctionTestClient {
  //
  private readonly lambda: AWS.Lambda;

  constructor(region: string, private functionName: string) {
    this.lambda = new AWS.Lambda({ region });
  }

  async invokeAsync(request?: Record<string, any>): Promise<Record<string, any> | undefined> {
    //
    const lambdaPayload = request ? { Payload: JSON.stringify(request) } : {};

    const params = {
      FunctionName: this.functionName,
      ...lambdaPayload,
    };

    const { Payload } = await this.lambda.invoke(params).promise();

    if (Payload) {
      return JSON.parse(Payload.toString());
    }

    return undefined;
  }
}
