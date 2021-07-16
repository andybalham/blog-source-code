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
  testObserverFunctionIds?: string[];
}

export default abstract class IntegrationTestStack extends cdk.Stack {
  //
  readonly testResourceTagKey: string;

  static readonly IntegrationTestTableId = 'IntegrationTestTable';

  readonly integrationTestTable: dynamodb.Table;

  readonly testObserverFunction: lambda.IFunction;

  readonly testObserverFunctions: Record<string, lambda.IFunction>;

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
      this.testObserverFunction = this.newTestObserverFunction(props, 'Default');
    }

    if (props.testObserverFunctionIds) {
      //
      this.testObserverFunctions = {};

      props.testObserverFunctionIds
        .map((i) => ({ observerId: i, function: this.newTestObserverFunction(props, i) }))
        .forEach((iaf) => {
          this.testObserverFunctions[iaf.observerId] = iaf.function;
        });
    }
  }

  private newTestObserverFunction(
    props: IntegrationTestStackProps,
    observerId: string
  ): lambda.IFunction {
    //
    if (!props.deployIntegrationTestTable) {
      throw new Error(
        `props.deployIntegrationTestTable must be 'true' for observer functions, but is: ${props.deployIntegrationTestTable}`
      );
    }

    const functionEntryBase = path.join(__dirname, '.');

    const testObserverFunction = new lambdaNodejs.NodejsFunction(
      this,
      `TestObserverFunction-${observerId}`,
      {
        runtime: lambda.Runtime.NODEJS_12_X,
        entry: path.join(functionEntryBase, `testObserverFunction.ts`),
        handler: 'handler',
        environment: {
          OBSERVER_ID: observerId,
          INTEGRATION_TEST_TABLE_NAME: this.integrationTestTable.tableName,
        },
      }
    );

    this.integrationTestTable.grantReadWriteData(testObserverFunction);
    return testObserverFunction;
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
