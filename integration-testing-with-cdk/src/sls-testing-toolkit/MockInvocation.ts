export interface MockInvocation {
  mockId: string;
  index: number;
  request: Record<string, any>;
}
