/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable indent */
/* eslint-disable max-classes-per-file */
/* eslint-disable import/prefer-default-export */
/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdkDynamodb from '@aws-cdk/aws-dynamodb';
import * as cdkLambda from '@aws-cdk/aws-lambda';
import { Construct } from '@aws-cdk/core';
import AWS from 'aws-sdk';
import { PutItemInput, PutItemOutput } from 'aws-sdk/clients/dynamodb';
import SelfDeployService from './SelfDeployService';

type SelfDeployTableProps = Omit<cdkDynamodb.TableProps, 'partitionKey'>;

export abstract class SelfDeployTable
  implements SelfDeployService<cdkDynamodb.ITable, SelfDeployTableProps>
{
  //
  public tableConstruct: cdkDynamodb.ITable;

  constructor(public id: string) {}

  newConstruct(scope: Construct, props?: SelfDeployTableProps): cdkDynamodb.ITable {
    this.tableConstruct = new cdkDynamodb.Table(scope, this.id, {
      ...this.getTableProps(),
      ...props,
    });
    return this.tableConstruct;
  }

  getName(): string {
    const name = process.env[this.getEnvVarName()];
    if (name === undefined) throw new Error('name === undefined');
    return name;
  }

  abstract getTableProps(): cdkDynamodb.TableProps;

  public getEnvVarName(): string {
    return `service_${this.id}_table_name`.toUpperCase();
  }

  public getWriter(): SelfDeployTableWrite {
    return new SelfDeployTableWrite(this);
  }
}

export class SelfDeployTableWrite {
  //
  readonly client: AWS.DynamoDB.DocumentClient;

  constructor(public table: SelfDeployTable) {
    this.client = new AWS.DynamoDB.DocumentClient();
  }

  configureFunction(lambdaFunction: cdkLambda.Function): void {
    if (this.table === undefined) throw new Error('this.table === undefined');
    this.table.tableConstruct.grantReadWriteData(lambdaFunction);
    lambdaFunction.addEnvironment(this.table.getEnvVarName(), this.table.tableConstruct.tableName);
  }

  async putAsync(params: Omit<PutItemInput, 'TableName'>): Promise<PutItemOutput> {
    return this.client
      .put({
        TableName: this.table.getName(),
        ...params,
      })
      .promise();
  }
}
