import DynamoDBClient from './DynamoDBClient';

export interface TestStateItem {
  scenario: string;
  itemId: string;
  itemData: Record<string, any>;
}

export default class TestStateRepository {
  //
  constructor(private testStateClient: DynamoDBClient) {
    this.testStateClient.partitionKeyName = 'scenario';
    this.testStateClient.sortKeyName = 'itemId';
  }

  async setCurrentTestAsync(scenario: string, params: Record<string, any>): Promise<void> {
    //
    const previousScenarioItems = await this.getTestResultsAsync(scenario);

    await Promise.all(
      previousScenarioItems.map((item) =>
        this.testStateClient.deleteAsync({
          scenario: item.scenario,
          itemId: item.itemId,
        })
      )
    );

    const currentTest: TestStateItem = {
      scenario: 'current',
      itemId: 'scenario',
      itemData: { scenario, params, startTime: Date.now() },
    };

    await this.testStateClient.putAsync(currentTest);
  }

  public async getCurrentTestAsync(): Promise<{
    scenario: string;
    params: Record<string, any>;
    startTime: number;
  }> {
    //
    const currentScenarioItem = await this.testStateClient.getAsync<TestStateItem>({
      scenario: 'current',
      itemId: 'scenario',
    });

    if (currentScenarioItem === undefined)
      throw new Error('currentScenarioStateItem === undefined');

    return {
      scenario: currentScenarioItem.itemData.scenario,
      params: currentScenarioItem.itemData.params,
      startTime: currentScenarioItem.itemData.startTime,
    };
  }

  async putTestResultAsync(resultId: string, resultData?: Record<string, any>): Promise<void> {
    //
    const currentTest = await this.getCurrentTestAsync();

    const resultItem: TestStateItem = {
      scenario: currentTest.scenario,
      itemId: `result-${resultId}`,
      itemData: resultData ?? {},
    };

    await this.testStateClient.putAsync(resultItem);
  }

  async getTestResultsAsync(scenario: string): Promise<TestStateItem[]> {
    return this.testStateClient.queryBySortKeyPrefixAsync<TestStateItem>(scenario, 'result-');
  }

  async putTestStateAsync(stateId: string, stateData?: Record<string, any>): Promise<void> {
    //
    const currentTest = await this.getCurrentTestAsync();

    const stateItem: TestStateItem = {
      scenario: currentTest.scenario,
      itemId: `state-${stateId}`,
      itemData: stateData ?? {},
    };

    await this.testStateClient.putAsync(stateItem);
  }

  async getTestStateAsync(stateId: string): Promise<Record<string, any> | undefined> {
    //
    const { scenario } = await this.getCurrentTestAsync();

    const stateItem = await this.testStateClient.getAsync<TestStateItem>({
      scenario,
      itemId: `state-${stateId}`,
    });

    return stateItem?.itemData;
  }
}
