/* eslint-disable import/prefer-default-export */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
// import TestApi from './TestRestApi';
// import TestStateDynamoDBTable from './TestStateDynamoDBTable';
// import TestRunner, { TestPollResponse } from './TestRunner';
// import TestStarterFunction from './TestStarterFunction';
// import TestPollerFunction from './TestPollerFunction';
// import TestStateRepository from './TestStateRepository';

const newTestFunction = ({
  scope,
  entry,
  name,
  environment,
}: {
  scope: cdk.Construct;
  entry: string;
  name: string;
  environment: { [key: string]: string };
}): lambda.Function => {
  //
  const id = `${name}Function`;
  const handler = `${name.replace(/^([A-Z]+(?=[A-Z])|[A-Z][a-z])/, (match: string) =>
    match.toLowerCase()
  )}Handler`;

  return new lambdaNodejs.NodejsFunction(scope, id, {
    entry,
    handler,
    environment,
  });
};

export {
  newTestFunction,
  // TestRunner,
  // TestApi,
  // TestStarterFunction,
  // TestPollerFunction,
  // TestPollResponse,
  // TestStateDynamoDBTable,
  // TestStateRepository,
};
