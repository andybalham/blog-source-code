/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';

export interface IntegrationTestStackProps {
  testResourceTagKey: string;
}

export default abstract class IntegrationTestStack extends cdk.Stack {
  //
  readonly testResourceTagKey: string;

  readonly integrationTestTable: dynamodb.Table;

  constructor(scope: cdk.Construct, id: string, props: IntegrationTestStackProps) {
    super(scope, id);

    this.testResourceTagKey = props.testResourceTagKey;

    this.integrationTestTable = new dynamodb.Table(this, 'IntegrationTestTable', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    cdk.Tags.of(this.integrationTestTable).add(this.testResourceTagKey, 'IntegrationTestTable');

    cdk.Tags.of(this).add('stack', id);
  }
}
