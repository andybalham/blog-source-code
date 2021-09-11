/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/prefer-default-export */

import { OrchestratorHandler } from '../../src';

class SimpleSequenceHandler extends OrchestratorHandler {
  // TODO 11Sep21: This is where we define the flow
  // TODO 11Sep21: How do we reference lambdas?
  // TODO 11Sep21: What would be needed at runtime?
  /*
  TargetFunctionId - Where would we get this from? The construct?
  */
}

// TODO 11Sep21: Could we make this more functional?

const simpleSequenceHandler = new SimpleSequenceHandler();

export const handler = async (event: any): Promise<any> => simpleSequenceHandler.handleAsync(event);
