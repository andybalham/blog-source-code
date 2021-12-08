/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import SelfDeployServiceBase from './SelfDeployServiceBase';

export default abstract class SelfDeployFunctionBase {
  //
  public readonly serviceList = new Array<SelfDeployServiceBase>();

  constructor(public appFileName: string, public id: string) {}

  newConstruct(scope: cdk.Construct): lambda.IFunction {
    const cdkFunction = new lambdaNodejs.NodejsFunction(scope, this.id, {
      ...this.getFunctionProps(),
      entry: this.appFileName,
      handler: `handle${this.id}`,
    });

    this.serviceList.forEach((s) => s.addConfiguration(cdkFunction));

    return cdkFunction;
  }

  abstract handleEventAsync(event: any): Promise<any>;

  getFunctionProps(): lambdaNodejs.NodejsFunctionProps {
    return {};
  }
}
