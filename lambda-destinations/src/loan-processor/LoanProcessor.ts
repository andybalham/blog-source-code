/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable import/no-extraneous-dependencies */
import * as sqs from '@aws-cdk/aws-sqs';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as lambdaDestinations from '@aws-cdk/aws-lambda-destinations';
import * as ssm from '@aws-cdk/aws-ssm';
import { CREDIT_REFERENCE_URL_PARAMETER_NAME_ENV_VAR } from './LoanProcessor.CreditReferenceProxyFunction';
import { IDENTITY_CHECK_URL_PARAMETER_NAME_ENV_VAR } from './LoanProcessor.IdentityCheckProxyFunction';

export interface LoanProcessorProps {
  creditReferenceUrlParameterName: string;
  identityCheckUrlParameterName: string;
}

export default class LoanProcessor extends cdk.Construct {
  //
  readonly inputFunction: lambda.IFunction;

  readonly outputQueue: sqs.IQueue;

  readonly failureQueue: sqs.IQueue;

  constructor(scope: cdk.Construct, id: string, props: LoanProcessorProps) {
    super(scope, id);

    // Output queue

    this.outputQueue = new sqs.Queue(this, 'OutputQueue', {
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      visibilityTimeout: cdk.Duration.seconds(3),
    });

    // Failure queue

    this.failureQueue = new sqs.Queue(this, 'FailureQueue', {
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      visibilityTimeout: cdk.Duration.seconds(3),
    });

    // Credit reference proxy function

    const creditReferenceApiUrlParameter = ssm.StringParameter.fromStringParameterName(
      scope,
      'CreditReferenceApiUrlParameter',
      props.creditReferenceUrlParameterName
    );

    const creditReferenceProxyFunction = new lambdaNodejs.NodejsFunction(
      scope,
      'CreditReferenceProxyFunction',
      {
        environment: {
          [CREDIT_REFERENCE_URL_PARAMETER_NAME_ENV_VAR]: props.creditReferenceUrlParameterName,
        },
        retryAttempts: 0,
        onSuccess: new lambdaDestinations.SqsDestination(this.outputQueue),
        onFailure: new lambdaDestinations.SqsDestination(this.failureQueue),
      }
    );

    creditReferenceApiUrlParameter.grantRead(creditReferenceProxyFunction);

    // Credit reference proxy function

    const identityCheckApiUrlParameter = ssm.StringParameter.fromStringParameterName(
      scope,
      'IdentityCheckApiUrlParameter',
      props.identityCheckUrlParameterName
    );

    const identityCheckProxyFunction = new lambdaNodejs.NodejsFunction(
      scope,
      'IdentityCheckProxyFunction',
      {
        environment: {
          [IDENTITY_CHECK_URL_PARAMETER_NAME_ENV_VAR]: props.identityCheckUrlParameterName,
        },
        retryAttempts: 0,
        onSuccess: new lambdaDestinations.LambdaDestination(creditReferenceProxyFunction, {          
          responseOnly: true, // auto-extract on success
        }),
        onFailure: new lambdaDestinations.SqsDestination(this.failureQueue),
      }
    );

    identityCheckApiUrlParameter.grantRead(identityCheckProxyFunction);

    // Set the input function

    this.inputFunction = identityCheckProxyFunction;
  }
}
