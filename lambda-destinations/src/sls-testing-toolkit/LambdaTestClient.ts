/* eslint-disable import/no-extraneous-dependencies */
import { LambdaTestClient as LambdaTestClientBase } from '@andybalham/sls-testing-toolkit';
import { InvokeAsyncResponse } from 'aws-sdk/clients/lambda';

export default class LambdaTestClient extends LambdaTestClientBase {
  async asyncInvokeAsync(request?: Record<string, any>): Promise<InvokeAsyncResponse> {
    //
    const lambdaInvokeArgs = { InvokeArgs: JSON.stringify(request || {}) };

    const params = {
      FunctionName: this.functionName,
      ...lambdaInvokeArgs,
    };

    const asyncResponse = await this.lambda.invokeAsync(params).promise();

    return asyncResponse;
  }
}
