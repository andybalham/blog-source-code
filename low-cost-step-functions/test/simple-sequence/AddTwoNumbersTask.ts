/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import { LambdaTask } from '../../src';
import { LambdaTaskBaseProps } from '../../src/LambdaTask';
import {
  AddTwoNumbersRequest,
  AddTwoNumbersResponse,
  AddTwoNumbersTaskHandler,
} from './AddTwoNumbersTask.handler';

export default class AddTwoNumbersTask extends LambdaTask<
  AddTwoNumbersRequest,
  AddTwoNumbersResponse
> {
  constructor(scope: cdk.Construct, id: string, props: LambdaTaskBaseProps) {
    super(scope, id, {
      ...props,
      handlerType: AddTwoNumbersTaskHandler,
      handlerFunction: new lambdaNodejs.NodejsFunction(scope, 'handler'),
    });
  }
}
