export default class IntegrationTestClient {
  //
  constructor(private integrationTestTableName: string) {}

  // eslint-disable-next-line class-methods-use-this
  async initialiseTest<T>(testId: string, inputs?: T): Promise<void> {
    throw new Error(`errorMessage`);
  }

  // eslint-disable-next-line class-methods-use-this
  async getCurrentTest<T>(): Promise<{testId: string, inputs?: T}> {
    throw new Error(`errorMessage`);
  }

  // eslint-disable-next-line class-methods-use-this
  async getMockState<T>(mockId: string): Promise<T> {
    throw new Error(`errorMessage`);
  }

  // eslint-disable-next-line class-methods-use-this
  async setMockState<T>(mockId: string, state: T): Promise<void> {
    throw new Error(`errorMessage`);
  }

  // eslint-disable-next-line class-methods-use-this
  async setTestOutput<T>(outputId: string, output?: T): Promise<void> {
    throw new Error(`errorMessage`);
  }

  // eslint-disable-next-line class-methods-use-this
  async getTestOutputs<T>(): Promise<T[]> {
    throw new Error(`errorMessage`);
  }
}
