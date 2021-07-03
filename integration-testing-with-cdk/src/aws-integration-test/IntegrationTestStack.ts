/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';

export interface IntegrationTestStackProps {
  testResourceTagKey: string;
  generateTestObserverFunction?: boolean;
}

export default abstract class IntegrationTestStack extends cdk.Stack {
  //
  readonly testResourceTagKey: string;

  static readonly IntegrationTestTableId = 'IntegrationTestTable';

  readonly integrationTestTable: dynamodb.Table;

  readonly testObserverFunction: lambda.IFunction;

  constructor(scope: cdk.Construct, id: string, props: IntegrationTestStackProps) {
    super(scope, id);

    this.testResourceTagKey = props.testResourceTagKey;

    // Test table

    this.integrationTestTable = new dynamodb.Table(
      this,
      IntegrationTestStack.IntegrationTestTableId,
      {
        partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      }
    );

    this.addTestResourceTag(this.integrationTestTable, IntegrationTestStack.IntegrationTestTableId);

    if (props.generateTestObserverFunction) {
      //
      // Test subscriber function

      const functionEntryBase = path.join(__dirname, '.');

      this.testObserverFunction = new lambdaNodejs.NodejsFunction(this, 'TestObserverFunction', {
        runtime: lambda.Runtime.NODEJS_12_X,
        entry: path.join(functionEntryBase, `testObserverFunction.ts`),
        handler: 'handler',
        environment: {
          INTEGRATION_TEST_TABLE_NAME: this.integrationTestTable.tableName,
        },
      });

      this.integrationTestTable.grantReadWriteData(this.testObserverFunction);
    }

    // TODO 03Jul21: Do we need this? Do we benefit from this?
    cdk.Tags.of(this).add('stack', id);
  }

  addTestResourceTag(scope: cdk.IConstruct, resourceId: string): void {
    cdk.Tags.of(scope).add(this.testResourceTagKey, resourceId);
  }
}
