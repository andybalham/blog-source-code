export default class MockInvocation {
  //
  mockId: string;

  index: number;

  request: Record<string, any>;

  static getCountById(invocations: MockInvocation[], mockId: string): number {
    return MockInvocation.filterById(invocations, mockId).length;
  }

  static filterById(invocations: MockInvocation[], mockId: string): MockInvocation[] {
    return invocations.filter((o) => o.mockId === mockId);
  }
}
