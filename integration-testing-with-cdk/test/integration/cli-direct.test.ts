/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-use-before-define */
import * as child from 'child_process';
import path from 'path';
import { nanoid } from 'nanoid';
import fs from 'fs';
import AWS from 'aws-sdk';
import { expect } from 'chai';
import { Configuration, File, FileType } from '../../src/contracts';
import { FileEvent, FileEventType } from '../../src/contracts/FileEvent';
import { FileSectionType } from '../../src/contracts/FileSectionType';

describe('S3 CLI-based tests', () => {
  //
  const testBucketName = 'fileeventpublisherteststack-testbucket560b80bc-1zahbchghxtm';
  const testResultsTableName = 'FileEventPublisherTestStack-TestResultsTable04198A62-1KTVQKN21HCDG';

  beforeEach('Run command line', async () => {
    //
    // const cleanTestBucketCommand = `aws s3 rm --recursive s3://${testBucketName}`;
    // console.log(await execCommand(cleanTestBucketCommand));
  });

  it('New file', async () => {
    // Arrange

    const configurationFile = newConfigurationFile();
    const configurationFileName = saveFile(configurationFile);

    try {
      // Act

      await uploadTestFileAsync(configurationFileName, testBucketName);
    } finally {
      fs.unlinkSync(configurationFileName);
    }

    // Wait

    await waitAsync(2);

    // Assert

    const expressionAttributeFilePath = path.join(__dirname, 'expression-attribute.json');

    fs.writeFileSync(
      expressionAttributeFilePath,
      JSON.stringify({
        ':s3Key': { S: configurationFileName },
      })
    );

    let messages: FileEvent[];

    try {
      const queryTestResultsCommand = `aws dynamodb query \
        --table-name ${testResultsTableName} \
        --key-condition-expression "s3Key = :s3Key" \
        --expression-attribute-values file://${expressionAttributeFilePath}"`;

      const queryResult = JSON.parse(await execCommand(queryTestResultsCommand));

      messages = queryResult.Items.map((item) => AWS.DynamoDB.Converter.unmarshall(item).message);
    } finally {
      fs.unlinkSync(expressionAttributeFilePath);
    }

    expect(messages.length).to.equal(2);

    expect(
      messages.some(
        (m) => m.eventType === FileEventType.Created && m.sectionType === FileSectionType.Header
      )
    );

    expect(
      messages.some(
        (m) => m.eventType === FileEventType.Created && m.sectionType === FileSectionType.Body
      )
    );
  }).timeout(60 * 1000);
});

function saveFile(file: File<Configuration>): string {
  const fileName = `${file.header.name}.json`;
  fs.writeFileSync(fileName, JSON.stringify(file));
  return fileName;
}

function newConfigurationFile(): File<Configuration> {
  //
  const configFile: File<Configuration> = {
    header: {
      fileType: FileType.Configuration,
      name: `Configuration_${nanoid(10)}`,
    },
    body: {
      incomeMultiplier: 0,
    },
  };

  return configFile;
}

async function uploadTestFileAsync(testFileName: string, testBucketName: string): Promise<void> {
  const uploadTestFileCommand = `aws s3 cp ${testFileName} s3://${testBucketName}`;
  console.log(await execCommand(uploadTestFileCommand));
}

async function execCommand(command: string): Promise<string> {
  //
  return new Promise((resolve, reject) => {
    child.exec(command, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

async function waitAsync(waitSeconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
}
