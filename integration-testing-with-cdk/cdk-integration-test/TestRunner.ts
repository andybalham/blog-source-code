/* eslint-disable import/no-extraneous-dependencies */
// eslint-disable-next-line max-classes-per-file
import axios from 'axios';

export interface TestRunResult {
  success: boolean;
  message?: string;
}

export interface TestStartRequest {
  scenario: string;
}

export interface TestPollRequest {
  scenario: string;
}

export interface TestPollResponse {
  success?: boolean;
  message?: string;
}

export default class TestRunner {
  //
  constructor(
    private testApiConfig: {
      baseURL: string | undefined;
      headers: { 'x-api-key': string | undefined };
    }
  ) {}

  async runTestAsync(scenario: string, timeoutSeconds = 6, pollIntervalSeconds = 2): Promise<TestRunResult> {
    //
    const testStartRequest: TestStartRequest = {
      scenario,
    };

    const startResponse = await axios.post<void>(
      'start-test',
      testStartRequest,
      this.testApiConfig
    );

    if (startResponse.status !== 200) {
      return {
        success: false,
        message: `${scenario} returned unexpected HTTP status for start: ${startResponse.status}`,
      };
    }

    const testPollRequest: TestPollRequest = {
      scenario,
    };

    const expiryTime = Date.now() + 1000 * timeoutSeconds;

    while (Date.now() < expiryTime) {
      //
      // eslint-disable-next-line no-await-in-loop
      await TestRunner.waitAsync(pollIntervalSeconds);

      // eslint-disable-next-line no-await-in-loop
      const pollResponse = await axios.post<TestPollResponse>(
        'poll-test',
        testPollRequest,
        this.testApiConfig
      );

      if (pollResponse.status !== 200) {
        return {
          success: false,
          message: `${scenario} returned unexpected HTTP status for poll: ${pollResponse.status}`,
        };
      }

      if (pollResponse.data.success !== undefined) {
        return { ...pollResponse.data, success: pollResponse.data.success ?? false };
      }
    }

    return {
      success: false,
      message: `${scenario} timed out`,
    };
  }

  private static async waitAsync(waitSeconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
  }
}
