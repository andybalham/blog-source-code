import ApiGatewayFunction, { ApiGatewayFunctionProps } from './ApiGatewayFunction';
import { TestStartRequest } from './TestRunner';
import TestStateRepository from './TestStateRepository';

export type TestStarterFunctionProps = ApiGatewayFunctionProps;

export default abstract class TestStarterFunction extends ApiGatewayFunction<
  TestStartRequest,
  void
> {
  //
  testStarterProps: TestStarterFunctionProps = {};

  testParams: { [scenario: string]: () => Record<string, any> } = {};

  tests: {
    [scenario: string]: (test: { scenario: string; params: Record<string, any> }) => Promise<any>;
  } = {};

  constructor(private testStateRepository: TestStateRepository, props?: TestStarterFunctionProps) {
    super(props);
    this.testStarterProps = { ...this.testStarterProps, ...props };
  }

  async handleRequestAsync({ scenario }: TestStartRequest): Promise<void> {
    //
    const scenarioParamGetter = this.testParams[scenario];

    const testParams = scenarioParamGetter ? scenarioParamGetter() : {};

    await this.testStateRepository.setCurrentTestAsync(scenario, testParams);

    await this.startTestAsync(scenario, testParams);
  }

  async startTestAsync(scenario: string, params: Record<string, any>): Promise<void> {
    //
    const testStarter = this.tests[scenario];

    if (testStarter === undefined) throw new Error(`testStarter === undefined for ${scenario}`);

    if (this.apiGatewayProps.log?.debug)
      this.apiGatewayProps.log?.debug('About to start via', { testStarter });

    await testStarter({ scenario, params });
  }
}
