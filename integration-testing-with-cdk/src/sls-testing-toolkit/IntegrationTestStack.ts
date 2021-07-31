/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';

export interface IntegrationTestStackProps {
  testResourceTagKey: string;
  integrationTestTable?: boolean;
  observerIds?: string[];
  mockIds?: string[];
}

// TODO 31Jul21: Rename to UnitTestStack, UnitTestTable etc when in a separate package
export default abstract class IntegrationTestStack extends cdk.Stack {
  //
  readonly testResourceTagKey: string;

  static readonly IntegrationTestTableId = 'IntegrationTestTable';

  readonly integrationTestTable: dynamodb.Table;

  readonly testFunctions: Record<string, lambda.IFunction>;

  constructor(scope: cdk.Construct, id: string, props: IntegrationTestStackProps) {
    super(scope, id);

    this.testResourceTagKey = props.testResourceTagKey;

    if (
      props.integrationTestTable ||
      (props.observerIds?.length ?? 0) > 0 ||
      (props.mockIds?.length ?? 0) > 0
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

    this.testFunctions = {};

    if (props.observerIds) {
      props.observerIds
        .map((i) => ({ observerId: i, function: this.newObserverFunction(i) }))
        .forEach((iaf) => {
          this.testFunctions[iaf.observerId] = iaf.function;
        });
    }

    if (props.mockIds) {
      props.mockIds
        .map((i) => ({ mockId: i, function: this.newMockFunction(i) }))
        .forEach((iaf) => {
          this.testFunctions[iaf.mockId] = iaf.function;
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
