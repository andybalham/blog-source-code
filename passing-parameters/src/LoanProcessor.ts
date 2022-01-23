/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as ssm from '@aws-cdk/aws-ssm';
import {
  // CREDIT_REFERENCE_URL_ENV_VAR,
  CREDIT_REFERENCE_URL_PARAMETER_NAME_ENV_VAR,
} from './LoanProcessor.CreditReferenceProxyFunction';

export interface LoanProcessorProps {
  creditReferenceUrlParameterName: string;
}

export default class LoanProcessor extends cdk.Construct {
  readonly creditReferenceProxyFunction: lambda.IFunction;

  constructor(scope: cdk.Construct, id: string, props: LoanProcessorProps) {
    super(scope, id);

    const creditReferenceApiUrlParameter = ssm.StringParameter.fromStringParameterAttributes(
      this,
      'CreditReferenceApiUrlParameter',
      {
        parameterName: props.creditReferenceUrlParameterName,
      }
    );

    this.creditReferenceProxyFunction = new lambdaNodejs.NodejsFunction(
      this,
      'CreditReferenceProxyFunction',
      {
        environment: {
          // [CREDIT_REFERENCE_URL_ENV_VAR]: creditReferenceApiUrlParameter.stringValue,
          [CREDIT_REFERENCE_URL_PARAMETER_NAME_ENV_VAR]: props.creditReferenceUrlParameterName,
        },
      }
    );

    creditReferenceApiUrlParameter.grantRead(this.creditReferenceProxyFunction);
  }
}
