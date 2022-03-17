/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as ssm from '@aws-cdk/aws-ssm';
import {
  ERROR_PERCENTAGE_ENV_VAR,
  MIN_DELAY_MILLIS_ENV_VAR,
} from './IdentityCheckApi.IdentityCheckFunction';

export interface IdentityCheckApiProps {
  urlParameterName: string;
}

export default class IdentityCheckApi extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: IdentityCheckApiProps) {
    super(scope, id);

    const httpApi = new HttpApi(this, 'IdentityCheckHttpApi', {
      description: 'Credit Reference API',
    });

    new ssm.StringParameter(this, 'IdentityCheckApiUrlParameter', {
      parameterName: props.urlParameterName,
      stringValue: httpApi.url ?? '<undefined>',
      description: 'The base URL for the credit reference API',
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });

    const apiFunction = new lambdaNodejs.NodejsFunction(this, 'IdentityCheckFunction', {
      environment: {
        [MIN_DELAY_MILLIS_ENV_VAR]: '100',
        [ERROR_PERCENTAGE_ENV_VAR]: '0',
      },
    });

    httpApi.addRoutes({
      path: '/request',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('IdentityCheckApiIntegration', apiFunction),
    });

    new cdk.CfnOutput(this, 'IdentityCheckApiUrlOutput', {
      value: httpApi.url ?? '<undefined>',
      description: 'The base URL for the credit reference API',
    });
  }
}
