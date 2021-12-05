/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import SelfDeployFunction from './package/SelfDeployFunction';

type LoggingServices = Record<string, never>;

export default class LoggingFunction extends SelfDeployFunction<LoggingServices> {
  //
  async handleEventAsync(event: any): Promise<any> {
    console.log(JSON.stringify({ event }, null, 2));
  }

  getFunctionProps(): lambdaNodejs.NodejsFunctionProps {
    return {
      runtime: lambda.Runtime.NODEJS_14_X,
    };
  }
}
