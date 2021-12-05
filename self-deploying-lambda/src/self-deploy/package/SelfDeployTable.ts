/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-extraneous-dependencies */
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import { Construct } from '@aws-cdk/core';
import AWS from 'aws-sdk';
import SelfDeployService from './SelfDeployService';

export default abstract class SelfDeployTable extends SelfDeployService<dynamodb.ITable> {
  //
  private table: dynamodb.ITable;

  readonly client: AWS.DynamoDB.DocumentClient;

  constructor(id: string) {
    super(id);
    this.client = new AWS.DynamoDB.DocumentClient();
  }

  addConfiguration(lambdaFunction: lambda.Function): void {
    if (this.table === undefined) throw new Error('this.table === undefined');
    // TODO 05Dec21: How do we grant different sorts of access?
    this.table.grantFullAccess(lambdaFunction);
    lambdaFunction.addEnvironment(this.getEnvVarName(), this.table.tableName);
  }

  newConstruct(scope: Construct): dynamodb.ITable {
    this.table = new dynamodb.Table(scope, this.id, this.getTableProps());
    return this.table;
  }

  getName(): string {
    const name = process.env[this.getEnvVarName()];
    if (name === undefined) throw new Error('name === undefined');
    return name;
  }

  abstract getTableProps(): dynamodb.TableProps;

  private getEnvVarName(): string {
    return `service_${this.id}_table_name`.toUpperCase();
  }
}
