/* eslint-disable no-new */
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import { AsyncTask, Orchestrator } from '../../../src';
import {
  PerformNumericOperationRequest,
  PerformNumericOperationResponse,
  PerformNumericOperationTaskHandler,
} from './PerformNumericOperationTask.handler';

export default class PerformNumericOperationTask extends AsyncTask<
  PerformNumericOperationRequest,
  PerformNumericOperationResponse
> {
  constructor(orchestrator: Orchestrator, id: string) {
    super(orchestrator, id, {
      handlerType: PerformNumericOperationTaskHandler,
      handlerFunction: new lambdaNodejs.NodejsFunction(orchestrator, 'handler'),
    });
  }
}
