/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as sns from '@aws-cdk/aws-sns';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import path from 'path';
import {
  ENV_VAR_ACCOUNT_DETAIL_TABLE_NAME,
  ENV_VAR_CUSTOMER_TABLE_NAME,
} from './CustomerUpdatedHandler.AccountUpdaterFunctionV2';

export interface CustomerUpdatedProps {
  dataAccessLayerArn: string;
  customerUpdatedTopic: sns.ITopic;
  customerTableName: string;
  accountDetailTableName: string;
}

export default class CustomerUpdatedHandler extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: CustomerUpdatedProps) {
    super(scope, id);

    const customerTable = dynamodb.Table.fromTableName(
      this,
      'CustomerTable',
      props.customerTableName
    );

    const accountDetailTable = dynamodb.Table.fromTableName(
      this,
      'AccountDetailTable',
      props.accountDetailTableName
    );

    // V2 with domain contracts

    const accountUpdaterFunctionV2 = new lambdaNodejs.NodejsFunction(
      scope,
      'AccountUpdaterFunctionV2',
      {
        environment: {
          [ENV_VAR_CUSTOMER_TABLE_NAME]: props.customerTableName,
          [ENV_VAR_ACCOUNT_DETAIL_TABLE_NAME]: props.accountDetailTableName,
        },
      }
    );

    // props.customerUpdatedTopic.addSubscription(
    //   new snsSubs.LambdaSubscription(accountUpdaterFunctionV2)
    // );

    customerTable.grantReadData(accountUpdaterFunctionV2);
    accountDetailTable.grantReadWriteData(accountUpdaterFunctionV2);

    // V3 with Lambda layer

    const dataAccessLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'DataAccessLayer',
      props.dataAccessLayerArn
    );

    const accountUpdaterFunctionV3 = new lambda.Function(scope, 'AccountUpdaterFunctionV3', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'AccountUpdaterFunctionV3.handler',
      code: new lambda.AssetCode(
        path.join(__dirname, `/../../dist/src/application/account-updater`)
      ),
      environment: {
        [ENV_VAR_CUSTOMER_TABLE_NAME]: props.customerTableName,
        [ENV_VAR_ACCOUNT_DETAIL_TABLE_NAME]: props.accountDetailTableName,
      },
      layers: [dataAccessLayer],
    });

    props.customerUpdatedTopic.addSubscription(
      new snsSubs.LambdaSubscription(accountUpdaterFunctionV3)
    );

    customerTable.grantReadData(accountUpdaterFunctionV3);
    accountDetailTable.grantReadWriteData(accountUpdaterFunctionV3);
  }
}
