/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';

export default class TestStateDynamoDBTable extends dynamodb.Table {
  //
  constructor(scope: cdk.Construct, id: string, tableProps?: dynamodb.TableProps) {
    //
    super(scope, `${id}TestStateTable`, {
      ...tableProps,
      ...{
        partitionKey: { name: 'scenario', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'itemId', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    });
  }
}
