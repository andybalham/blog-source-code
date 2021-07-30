/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';

export interface IntegrationTestStackProps {
  testResourceTagKey: string;
  integrationTestTable?: boolean;
  observerFunctionIds?: string[];
  mockFunctionIds?: string[];
}

export default abstract class IntegrationTestStack extends cdk.Stack {
  //
  readonly testResourceTagKey: string;

  static readonly IntegrationTestTableId = 'IntegrationTestTable';

  readonly integrationTestTable: dynamodb.Table;

  // TODO 21Jul21: Change to just observers
  readonly observerFunctions: Record<string, lambda.IFunction>;

  // TODO 21Jul21: Change to just mocks
  readonly mockFunctions: Record<string, lambda.IFunction>;

  constructor(scope: cdk.Construct, id: string, props: IntegrationTestStackProps) {
    super(scope, id);

    this.testResourceTagKey = props.testResourceTagKey;

    if (
      props.integrationTestTable ||
      (props.observerFunctionIds?.length ?? 0) > 0 ||
      (props.mockFunctionIds?.length ?? 0) > 0
    ) {
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

    if (props.observerFunctionIds) {
      //
      this.observerFunctions = {};

      props.observerFunctionIds
        .map((i) => ({ observerId: i, function: this.newObserverFunction(i) }))
        .forEach((iaf) => {
          this.observerFunctions[iaf.observerId] = iaf.function;
        });
    }

    if (props.mockFunctionIds) {
      //
      this.mockFunctions = {};

      props.mockFunctionIds
        .map((i) => ({ mockId: i, function: this.newMockFunction(i) }))
        .forEach((iaf) => {
          this.mockFunctions[iaf.mockId] = iaf.function;
        });
    }
  }

  addTestResourceTag(resource: cdk.IConstruct, resourceId: string): void {
    cdk.Tags.of(resource).add(this.testResourceTagKey, resourceId);
  }

  private newObserverFunction(observerId: string): lambda.IFunction {
    //
    if (this.integrationTestTable === undefined)
      throw new Error('this.integrationTestTable === undefined');

    const functionEntryBase = path.join(__dirname, '.');

    const observerFunction = new lambdaNodejs.NodejsFunction(
      this,
      `ObserverFunction-${observerId}`,
      {
        runtime: lambda.Runtime.NODEJS_12_X,
        entry: path.join(functionEntryBase, `observerFunction.ts`),
        handler: 'handler',
        environment: {
          OBSERVER_ID: observerId,
          INTEGRATION_TEST_TABLE_NAME: this.integrationTestTable.tableName,
        },
      }
    );

    this.integrationTestTable.grantReadWriteData(observerFunction);
    return observerFunction;
  }

  private newMockFunction(mockId: string): lambda.IFunction {
    //
    const functionEntryBase = path.join(__dirname, '.');

    const mockFunction = new lambdaNodejs.NodejsFunction(this, `MockFunction-${mockId}`, {
      runtime: lambda.Runtime.NODEJS_12_X,
      entry: path.join(functionEntryBase, `mockFunction.ts`),
      handler: 'handler',
      environment: {
        MOCK_ID: mockId,
        INTEGRATION_TEST_TABLE_NAME: this.integrationTestTable.tableName,
      },
    });

    this.integrationTestTable.grantReadWriteData(mockFunction);

    return mockFunction;
  }
}
