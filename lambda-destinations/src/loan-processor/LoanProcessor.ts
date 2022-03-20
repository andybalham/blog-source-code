/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable import/no-extraneous-dependencies */
import * as sqs from '@aws-cdk/aws-sqs';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as lambdaDestinations from '@aws-cdk/aws-lambda-destinations';
import * as lambdaEventSources from '@aws-cdk/aws-lambda-event-sources';
import * as ssm from '@aws-cdk/aws-ssm';
import { CREDIT_REFERENCE_URL_PARAMETER_NAME_ENV_VAR } from './LoanProcessor.CreditReferenceProxyFunction';
import { IDENTITY_CHECK_URL_PARAMETER_NAME_ENV_VAR } from './LoanProcessor.IdentityCheckProxyFunction';
import {
  MAX_RETRY_COUNT_ENV_VAR,
  RETRY_QUEUE_URL_ENV_VAR,
} from './LoanProcessor.QueueRetriesFunction';
import { INPUT_FUNCTION_NAME_ENV_VAR } from './LoanProcessor.RetryFunction';

export interface LoanProcessorProps {
  creditReferenceUrlParameterName: string;
  identityCheckUrlParameterName: string;
  outputFunction: lambda.IFunction;
}

export default class LoanProcessor extends cdk.Construct {
  //
  readonly inputFunction: lambda.IFunction;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(scope: cdk.Construct, id: string, props: LoanProcessorProps) {
    super(scope, id);

    // On failure destination queue

    const onFailureQueue = new sqs.Queue(this, 'OnFailureQueue', {
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      visibilityTimeout: cdk.Duration.seconds(3),
    });

    // Retry queue

    const retryQueue = new sqs.Queue(this, 'RetryQueue', {
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
        // auto-extract on success
        onSuccess: new lambdaDestinations.LambdaDestination(props.outputFunction, {
          responseOnly: true,
        }),
        onFailure: new lambdaDestinations.SqsDestination(onFailureQueue),
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
        // auto-extract on success
        onSuccess: new lambdaDestinations.LambdaDestination(creditReferenceProxyFunction, {
          responseOnly: true,
        }),
        onFailure: new lambdaDestinations.SqsDestination(onFailureQueue),
      }
    );

    identityCheckApiUrlParameter.grantRead(identityCheckProxyFunction);

    // Set the external properties

    this.inputFunction = identityCheckProxyFunction;

    // Queue retries function

    const queueRetriesFunction = new lambdaNodejs.NodejsFunction(scope, 'QueueRetriesFunction', {
      // Does being on a queue count as being called asynchronously?
      // No, see https://aws.amazon.com/blogs/compute/introducing-aws-lambda-destinations/
      // onSuccess: new lambdaDestinations.SqsDestination(retryQueue),
      environment: {
        [RETRY_QUEUE_URL_ENV_VAR]: retryQueue.queueUrl,
        [MAX_RETRY_COUNT_ENV_VAR]: '3',
      },
      retryAttempts: 0,
    });

    onFailureQueue.grantConsumeMessages(queueRetriesFunction);

    queueRetriesFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(onFailureQueue, {
        enabled: true,
        batchSize: 1,
      })
    );

    retryQueue.grantSendMessages(queueRetriesFunction);

    // Retry function

    const retryFunction = new lambdaNodejs.NodejsFunction(scope, 'RetryFunction', {
      environment: {
        [INPUT_FUNCTION_NAME_ENV_VAR]: this.inputFunction.functionName,
      },
      retryAttempts: 0,
    });

    retryQueue.grantConsumeMessages(retryFunction);

    retryFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(retryQueue, {
        enabled: false,
        batchSize: 1,
      })
    );

    this.inputFunction.grantInvoke(retryFunction);
  }
}
