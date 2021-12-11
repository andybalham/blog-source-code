/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdkDynamodb from '@aws-cdk/aws-dynamodb';
import * as cdkLambda from '@aws-cdk/aws-lambda';
import { Construct } from '@aws-cdk/core';
import AWS from 'aws-sdk';
import { PutItemInput, PutItemOutput } from 'aws-sdk/clients/dynamodb';
import SelfDeployService from './SelfDeployService';

type SelfDeployTableProps = Omit<cdkDynamodb.TableProps, 'partitionKey'>;

export default abstract class SelfDeployTable extends SelfDeployService<
  cdkDynamodb.ITable,
  SelfDeployTableProps
> {
  //
  private table: cdkDynamodb.ITable;

  readonly client: AWS.DynamoDB.DocumentClient;

  constructor(id: string) {
    super(id);
    this.client = new AWS.DynamoDB.DocumentClient();
  }

  configureFunction(lambdaFunction: cdkLambda.Function): void {
    if (this.table === undefined) throw new Error('this.table === undefined');
    // TODO 05Dec21: How do we grant different sorts of access?
    this.table.grantFullAccess(lambdaFunction);
    lambdaFunction.addEnvironment(this.getEnvVarName(), this.table.tableName);
  }

  newConstruct(scope: Construct, props?: SelfDeployTableProps): cdkDynamodb.ITable {
    this.table = new cdkDynamodb.Table(scope, this.id, {
      ...this.getTableProps(),
      ...props,
    });
    return this.table;
  }

  getName(): string {
    const name = process.env[this.getEnvVarName()];
    if (name === undefined) throw new Error('name === undefined');
    return name;
  }

  async putAsync(params: Omit<PutItemInput, 'TableName'>): Promise<PutItemOutput> {
    return this.client
      .put({
        TableName: this.getName(),
        ...params,
      })
      .promise();
  }

  abstract getTableProps(): cdkDynamodb.TableProps;

  private getEnvVarName(): string {
    return `service_${this.id}_table_name`.toUpperCase();
  }
}
