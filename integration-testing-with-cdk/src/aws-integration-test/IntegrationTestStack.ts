/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';

export interface IntegrationTestStackProps {
  testResourceTagKey: string;
  deployIntegrationTestTable?: boolean;
  deployTestObserverFunction?: boolean;
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

    if (props.deployIntegrationTestTable) {
      //
      // Test table

      this.integrationTestTable = new dynamodb.Table(
        this,
        IntegrationTestStack.IntegrationTestTableId,
        {
          partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
          sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
          billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }
      );

      this.addTestResourceTag(
        this.integrationTestTable,
        IntegrationTestStack.IntegrationTestTableId
      );
    }

    if (props.deployTestObserverFunction) {
      //
      // Test subscriber function

      if (!props.deployIntegrationTestTable) {
        throw new Error(
          `props.deployIntegrationTestTable must be 'true' if props.deployTestObserverFunction is 'true', but is: ${props.deployIntegrationTestTable}`
        );
      }

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
  }

  addTestResourceTag(resource: cdk.IConstruct, resourceId: string): void {
    cdk.Tags.of(resource).add(this.testResourceTagKey, resourceId);
  }

  newMockFunction(mockId: string): lambda.IFunction {
    //
    const functionEntryBase = path.join(__dirname, '.');

    const testMockFunction = new lambdaNodejs.NodejsFunction(this, `TestMockFunction-${mockId}`, {
      runtime: lambda.Runtime.NODEJS_12_X,
      entry: path.join(functionEntryBase, `testMockFunction.ts`),
      handler: 'handler',
      environment: {
        MOCK_ID: mockId,
        INTEGRATION_TEST_TABLE_NAME: this.integrationTestTable.tableName,
      },
    });

    this.integrationTestTable.grantReadWriteData(testMockFunction);

    return testMockFunction;
  }
}
