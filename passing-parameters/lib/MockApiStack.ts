/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
// import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2';
// import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
// import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
// import * as ssm from '@aws-cdk/aws-ssm';
import CreditReferenceApi from '../src/mock-api/CreditReferenceApi';

export interface MockApiStackProps {
  creditReferenceUrlParameterName: string;
}

export default class MockApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: MockApiStackProps) {
    super(scope, id);

    new CreditReferenceApi(this, 'CreditReferenceApi', {
      urlParameterName: props.creditReferenceUrlParameterName,
    });

    // // 👇 create our HTTP Api
    // const mockApi = new HttpApi(this, 'http-api-example', {
    //   description: 'HTTP API example',
    //   // corsPreflight: {
    //   //   allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
    //   //   allowMethods: [
    //   //     CorsHttpMethod.OPTIONS,
    //   //     CorsHttpMethod.GET,
    //   //     CorsHttpMethod.POST,
    //   //     CorsHttpMethod.PUT,
    //   //     CorsHttpMethod.PATCH,
    //   //     CorsHttpMethod.DELETE,
    //   //   ],
    //   //   allowCredentials: true,
    //   //   allowOrigins: ['http://localhost:3000'],
    //   // },
    // });

    // const mockApiFunction = new lambdaNodejs.NodejsFunction(this, 'MockApiFunction');

    // // 👇 add route for GET /mock
    // mockApi.addRoutes({
    //   path: '/mock',
    //   methods: [HttpMethod.POST],
    //   integration: new HttpLambdaIntegration('get-mock-integration', mockApiFunction),
    // });

    // // const mockApi = new MockApi(this, 'MockApi', {
    // //   mockPayload: { message: 'Aloha!' },
    // // });

    // new ssm.StringParameter(this, 'MockApiUrlParameter', {
    //   parameterName: props.creditReferenceUrlParameterName,
    //   stringValue: mockApi.url ?? '<undefined>',
    //   description: 'The URL for the mock api',
    //   type: ssm.ParameterType.STRING,
    //   tier: ssm.ParameterTier.STANDARD,
    // });

    // new cdk.CfnOutput(this, 'MockApiUrlOutput', {
    //   value: mockApi.url ?? '<undefined>',
    //   description: 'The URL for the mock api',
    // });
  }
}
