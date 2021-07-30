export default class MockInvocation {
  //
  mockId: string;

  index: number;

  request: Record<string, any>;

  static getCountById(observations: MockInvocation[], mockId: string): number {
    return MockInvocation.filterById(observations, mockId).length;
  }

  static filterById(observations: MockInvocation[], mockId: string): MockInvocation[] {
    return observations.filter((o) => o.mockId === mockId);
  }
}
