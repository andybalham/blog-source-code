/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/prefer-default-export */

import { OrchestrationBuilder, OrchestratorHandler } from '../../src';

export interface Input {}
export interface Output {}
export interface Data {}

class EmptyOrchestratorHandler extends OrchestratorHandler<Input, Output, Data> {
  constructor() {
    super(
      new OrchestrationBuilder<Input, Output, Data>({ getData: (): Data => ({}) }).build()
    );
  }
}

export const handler = async (event: any): Promise<any> =>
  new EmptyOrchestratorHandler().handleAsync(event);
