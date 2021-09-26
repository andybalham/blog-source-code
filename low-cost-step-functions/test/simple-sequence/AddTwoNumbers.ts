/* eslint-disable no-new */
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import { AsyncTask, Orchestrator } from '../../src';
import {
  AddTwoNumbersRequest,
  AddTwoNumbersResponse,
  AddTwoNumbersHandler,
} from './AddTwoNumbers.AddTwoNumbersHandler';

export default class AddTwoNumbers extends AsyncTask<
  AddTwoNumbersRequest,
  AddTwoNumbersResponse
> {
  constructor(orchestrator: Orchestrator, id: string) {
    super(orchestrator, id, {
      handlerType: AddTwoNumbersHandler,
      handlerFunction: new lambdaNodejs.NodejsFunction(
        orchestrator,
        AddTwoNumbersHandler.name
      ),
    });
  }
}
