/* eslint-disable no-new */
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import { AsyncTask, Orchestrator } from '../../src';
import {
  AddTwoNumbersRequest,
  AddTwoNumbersResponse,
  AddTwoNumbersTaskHandler,
} from './AddTwoNumbersTask.handler';

export default class AddTwoNumbersTask extends AsyncTask<
  AddTwoNumbersRequest,
  AddTwoNumbersResponse
> {
  constructor(orchestrator: Orchestrator, id: string) {
    super(orchestrator, id, {
      handlerType: AddTwoNumbersTaskHandler,
      handlerFunction: new lambdaNodejs.NodejsFunction(orchestrator, 'handler'),
    });
  }
}
