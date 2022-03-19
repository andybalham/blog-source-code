// eslint-disable-next-line import/no-extraneous-dependencies
import { IntegrationTestClient as IntegrationTestClientBase } from '@andybalham/sls-testing-toolkit';
import LambdaTestClient from './LambdaTestClient';

export default class IntegrationTestClient extends IntegrationTestClientBase {
  getLambdaTestClient(functionStackId: string): LambdaTestClient {
    //
    const functionName = this.getFunctionNameByStackId(functionStackId);

    if (functionName === undefined) {
      throw new Error(`The function name could not be resolved for id: ${functionStackId}`);
    }

    return new LambdaTestClient(IntegrationTestClient.getRegion(), functionName);
  }
}
