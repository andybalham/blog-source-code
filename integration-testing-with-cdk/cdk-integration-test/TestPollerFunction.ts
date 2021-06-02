/* eslint-disable import/no-extraneous-dependencies */
import ApiGatewayFunction, { ApiGatewayFunctionProps } from './ApiGatewayFunction';
import { TestPollRequest, TestPollResponse } from './TestRunner';
import TestStateRepository, { TestStateItem } from './TestStateRepository';

export default abstract class TestPollerFunction extends ApiGatewayFunction<
  TestPollRequest,
  TestPollResponse
> {
  //
  tests: {
    [scenario: string]: (test: {
      scenario: string;
      params: Record<string, any>;
      startTime: number;
      results: TestStateItem[];
    }) => TestPollResponse;
  } = {};

  constructor(private testStateRepository: TestStateRepository, props?: ApiGatewayFunctionProps) {
    super(props);
  }

  async handleRequestAsync({ scenario }: TestPollRequest): Promise<TestPollResponse> {
    //
    const currentTest = await this.testStateRepository.getCurrentTestAsync();

    const currentTestResults = await this.testStateRepository.getTestResultsAsync(scenario);

    if (currentTestResults.length < 1) {
      return {};
    }

    return this.pollTestAsync({ ...currentTest, results: currentTestResults });
  }

  async pollTestAsync(test: {
    scenario: string;
    params: Record<string, any>;
    startTime: number;
    results: TestStateItem[];
  }): Promise<TestPollResponse> {
    //
    const testPoller = this.tests[test.scenario];

    if (testPoller === undefined) throw new Error(`testPoller === undefined for ${test.scenario}`);

    if (this.apiGatewayProps.log?.debug)
      this.apiGatewayProps.log?.debug('About to poll via', { testPoller });

    const testPollResponse = testPoller(test);

    return testPollResponse;
  }
}
