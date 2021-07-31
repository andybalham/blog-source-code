/* eslint-disable import/no-extraneous-dependencies */
import { ResourceTagMappingList } from 'aws-sdk/clients/resourcegroupstaggingapi';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import IntegrationTestStack from './IntegrationTestStack';
import { CurrentTestItem, TestItemPrefix } from './TestItem';
import StateMachineTestClient from './StateMachineTestClient';
import TestObservation from './TestObservation';
import MockInvocation from './MockInvocation';
import { TestProps } from './TestProps';
import BucketTestClient from './BucketTestClient';
import FunctionTestClient from './FunctionTestClient';
import TopicTestClient from './TopicTestClient';
import TableTestClient from './TableTestClient';

dotenv.config();

export interface UnitTestClientProps {
  testResourceTagKey: string;
}

export default class UnitTestClient {
  //
  private static readonly tagging = new AWS.ResourceGroupsTaggingAPI({
    region: UnitTestClient.getRegion(),
  });

  private static readonly db = new AWS.DynamoDB.DocumentClient({
    region: UnitTestClient.getRegion(),
  });

  private static readonly sns = new AWS.SNS({ region: UnitTestClient.getRegion() });

  private static readonly lambda = new AWS.Lambda({ region: UnitTestClient.getRegion() });

  testResourceTagMappingList: ResourceTagMappingList;

  integrationTestTableName?: string;

  testId?: string;

  constructor(private props: UnitTestClientProps) {}

  // Static ------------------------------------------------------------------

  // TODO 21Jul21: Do we need this? What happens if we don't supply it?
  static getRegion(): string {
    if (process.env.AWS_REGION === undefined)
      throw new Error('process.env.AWS_REGION === undefined');
    return process.env.AWS_REGION;
  }

  static async sleepAsync(seconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  static async getResourcesByTagKeyAsync(key: string): Promise<ResourceTagMappingList> {
    // TODO 27Jun21: PaginationToken
    const resources = await UnitTestClient.tagging
      .getResources({
        TagFilters: [
          {
            Key: key,
          },
        ],
      })
      .promise();

    return resources.ResourceTagMappingList ?? [];
  }

  // Instance ----------------------------------------------------------------

  async initialiseClientAsync(): Promise<void> {
    //
    this.testResourceTagMappingList = await UnitTestClient.getResourcesByTagKeyAsync(
      this.props.testResourceTagKey
    );

    this.integrationTestTableName = this.getTableNameByStackId(
      IntegrationTestStack.IntegrationTestTableId
    );
  }

  async initialiseTestAsync(props: TestProps): Promise<void> {
    //
    if (!props.testId) {
      throw new Error(`A testId must be specified`);
    }

    this.testId = props.testId;

    if (this.integrationTestTableName !== undefined) {
      //
      // Clear down all data related to the test

      // TODO 03Jul21: Use LastEvaluatedKey
      const testQueryParams /*: QueryInput */ = {
        // QueryInput results in a 'Condition parameter type does not match schema type'
        TableName: this.integrationTestTableName,
        KeyConditionExpression: `PK = :PK`,
        ExpressionAttributeValues: {
          ':PK': this.testId,
        },
      };

      const testQueryOutput = await UnitTestClient.db.query(testQueryParams).promise();

      // TODO 03Jul21: Use batchWrite with delete requests
      if (testQueryOutput.Items) {
        const deletePromises = testQueryOutput.Items.map((item) =>
          UnitTestClient.db
            .delete({
              TableName: this.integrationTestTableName ?? 'undefined',
              Key: { PK: item.PK, SK: item.SK },
            })
            .promise()
        );
        await Promise.all(deletePromises);
      }

      // Set the current test and inputs

      const currentTestItem: CurrentTestItem = {
        ...{
          PK: 'Current',
          SK: 'Test',
        },
        props,
      };

      await UnitTestClient.db
        .put({
          TableName: this.integrationTestTableName,
          Item: currentTestItem,
        })
        .promise();
    }
  }

  async pollTestAsync({
    until,
    intervalSeconds,
    timeoutSeconds,
  }: {
    until: (observations: TestObservation[]) => Promise<boolean>;
    intervalSeconds: number;
    timeoutSeconds: number;
  }): Promise<{
    observations: TestObservation[];
    invocations: MockInvocation[];
    timedOut: boolean;
  }> {
    //
    const timeOutThreshold = Date.now() + 1000 * timeoutSeconds;

    const timedOut = (): boolean => Date.now() > timeOutThreshold;

    let observations = new Array<TestObservation>();

    // eslint-disable-next-line no-await-in-loop
    while (!timedOut() && !(await until(observations))) {
      //
      // eslint-disable-next-line no-await-in-loop
      await UnitTestClient.sleepAsync(intervalSeconds);

      // eslint-disable-next-line no-await-in-loop
      observations = await this.getTestObservationsAsync();
    }

    const invocations = await this.getMockInvocationsAsync();

    return {
      timedOut: !(await until(observations)),
      observations,
      invocations,
    };
  }

  async getTestObservationsAsync(): Promise<TestObservation[]> {
    //
    if (this.integrationTestTableName === undefined) {
      return [];
    }

    const queryOutputsParams /*: QueryInput */ = {
      // QueryInput results in a 'Condition parameter type does not match schema type'
      TableName: this.integrationTestTableName,
      KeyConditionExpression: `PK = :PK and begins_with(SK, :SKPrefix)`,
      ExpressionAttributeValues: {
        ':PK': this.testId,
        ':SKPrefix': TestItemPrefix.TestObservation,
      },
    };

    const queryOutputsOutput = await UnitTestClient.db.query(queryOutputsParams).promise();

    if (!queryOutputsOutput.Items) {
      return [];
    }

    // TODO 03Jul21: Use LastEvaluatedKey
    const observations = queryOutputsOutput.Items.map((i) => i.observation);

    return observations;
  }

  async getMockInvocationsAsync(): Promise<MockInvocation[]> {
    //
    if (this.integrationTestTableName === undefined) {
      return [];
    }

    const queryOutputsParams /*: QueryInput */ = {
      // QueryInput results in a 'Condition parameter type does not match schema type'
      TableName: this.integrationTestTableName,
      KeyConditionExpression: `PK = :PK and begins_with(SK, :SKPrefix)`,
      ExpressionAttributeValues: {
        ':PK': this.testId,
        ':SKPrefix': TestItemPrefix.MockInvocation,
      },
    };

    const queryOutputsOutput = await UnitTestClient.db.query(queryOutputsParams).promise();

    if (!queryOutputsOutput.Items) {
      return [];
    }

    // TODO 03Jul21: Use LastEvaluatedKey
    const invocations = queryOutputsOutput.Items.map((i) => i.invocation);

    return invocations;
  }

  getFunctionTestClient(functionStackId: string): FunctionTestClient {
    //
    const functionName = this.getFunctionNameByStackId(functionStackId);

    if (functionName === undefined) {
      throw new Error(`The function name could not be resolved for id: ${functionStackId}`);
    }

    return new FunctionTestClient(UnitTestClient.getRegion(), functionName);
  }

  getBucketTestClient(bucketStackId: string): BucketTestClient {
    //
    const bucketName = this.getBucketNameByStackId(bucketStackId);

    if (bucketName === undefined) {
      throw new Error(`The bucket name could not be resolved for id: ${bucketStackId}`);
    }

    return new BucketTestClient(UnitTestClient.getRegion(), bucketName);
  }

  getTableTestClient(tableStackId: string): TableTestClient {
    //
    const tableName = this.getTableNameByStackId(tableStackId);

    if (tableName === undefined) {
      throw new Error(`The table name could not be resolved for id: ${tableStackId}`);
    }

    return new TableTestClient(UnitTestClient.getRegion(), tableName);
  }

  getStateMachineTestClient(stateMachineStackId: string): StateMachineTestClient {
    //
    const stateMachineArn = this.getResourceArnByStackId(stateMachineStackId);

    if (stateMachineArn === undefined) {
      throw new Error(`The state machine ARN could not be resolved for id: ${stateMachineStackId}`);
    }

    return new StateMachineTestClient(UnitTestClient.getRegion(), stateMachineArn);
  }

  getTopicTestClient(topicStackId: string): TopicTestClient {
    //
    const topicArn = this.getResourceArnByStackId(topicStackId);

    if (topicArn === undefined) {
      throw new Error(`The state machine ARN could not be resolved for id: ${topicStackId}`);
    }

    return new TopicTestClient(UnitTestClient.getRegion(), topicArn);
  }

  getResourceArnByStackId(targetStackId: string): string | undefined {
    //
    if (this.testResourceTagMappingList === undefined)
      throw new Error('this.testResourceTagMappingList === undefined');

    const tagMatches = this.testResourceTagMappingList.filter(
      (r) =>
        r.Tags &&
        r.Tags.some((t) => t.Key === this.props.testResourceTagKey && t.Value === targetStackId)
    );

    if (tagMatches.length === 0) {
      return undefined;
    }

    if (tagMatches.length > 1) {
      throw new Error(
        `Found ${
          tagMatches.length
        } matches for ${targetStackId}, when 1 was expected: ${JSON.stringify(tagMatches)}`
      );
    }

    const tagMatchArn = tagMatches[0].ResourceARN ?? 'undefined';
    return tagMatchArn;
  }

  // https://docs.aws.amazon.com/service-authorization/latest/reference/reference_policies_actions-resources-contextkeys.html
  static readonly ResourceNamePatterns = {
    // arn:${Partition}:s3:::${BucketName}
    bucket: /^arn:aws:s3:::(?<name>.*)/,
    // arn:${Partition}:dynamodb:${Region}:${Account}:table/${TableName}
    table: new RegExp(`^arn:aws:dynamodb:${UnitTestClient.getRegion()}:[0-9]+:table/(?<name>.*)`),
    // arn:${Partition}:lambda:${Region}:${Account}:function:${FunctionName}:${Version}
    function: new RegExp(
      `^arn:aws:lambda:${UnitTestClient.getRegion()}:[0-9]+:function:(?<name>[^:]*)`
    ),
  };

  getBucketNameByStackId(targetStackId: string): string | undefined {
    const resourceName = this.getResourceNameFromArn(
      targetStackId,
      UnitTestClient.ResourceNamePatterns.bucket
    );
    return resourceName;
  }

  getTableNameByStackId(targetStackId: string): string | undefined {
    const resourceName = this.getResourceNameFromArn(
      targetStackId,
      UnitTestClient.ResourceNamePatterns.table
    );
    return resourceName;
  }

  getFunctionNameByStackId(targetStackId: string): string | undefined {
    const resourceName = this.getResourceNameFromArn(
      targetStackId,
      UnitTestClient.ResourceNamePatterns.function
    );
    return resourceName;
  }

  // Private --------------------------------------------------------

  private getResourceNameFromArn(targetStackId: string, arnPattern: RegExp): string | undefined {
    //
    const tagMatchArn = this.getResourceArnByStackId(targetStackId);

    if (tagMatchArn === undefined) {
      return undefined;
    }

    const arnMatch = tagMatchArn.match(arnPattern);

    if (!arnMatch || !arnMatch.groups?.name) {
      throw new Error(`ARN did not match expected pattern: ${tagMatchArn}`);
    }

    const resourceName = arnMatch.groups.name;
    return resourceName;
  }
}
