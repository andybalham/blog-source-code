/* eslint-disable no-new */
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import { AsyncTask, Orchestrator } from '../../../src';
import {
  PerformNumericOperationRequest,
  PerformNumericOperationResponse,
  PerformNumericOperationHandler,
} from './PerformNumericOperation.PerformNumericOperationHandler';

export default class PerformNumericOperation extends AsyncTask<
  PerformNumericOperationRequest,
  PerformNumericOperationResponse
> {
  constructor(orchestrator: Orchestrator, id: string) {
    super(orchestrator, id, {
      handlerType: PerformNumericOperationHandler,
      handlerFunction: new lambdaNodejs.NodejsFunction(
        orchestrator,
        PerformNumericOperationHandler.name
      ),
    });
  }
}
