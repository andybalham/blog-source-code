/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-extraneous-dependencies */
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { TableProps } from '@aws-cdk/aws-dynamodb';
import { SelfDeployTable } from './package/SelfDeployTable';

export default class TestTable extends SelfDeployTable {
  getTableProps(): TableProps {
    return {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    };
  }
}
