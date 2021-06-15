/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-use-before-define */
import * as child from 'child_process';
import path from 'path';
import { nanoid } from 'nanoid';
import fs from 'fs';
import { Configuration, File, FileType } from '../../src/contracts';

describe('S3 CLI-based tests', () => {
  //
  const testBucketName = 'fileeventpublisherteststack-testbucket560b80bc-1zahbchghxtm';

  beforeEach('Run command line', async () => {
    //
    // TODO 14Jun21: This is flawed, as we want to delete all DynamoDB items

    const cleanTestBucketCommand = `aws s3 rm --recursive s3://${testBucketName}`;
    console.log(await execCommand(cleanTestBucketCommand));
  });

  it('Clean test bucket', async () => {});

  it('No changes', async () => {
    //
    const configurationFile = newConfigurationFile();
    const configurationFileName = saveFile(configurationFile);

    try {
      await uploadTestFileAsync(configurationFileName, testBucketName);
      await uploadTestFileAsync(configurationFileName, testBucketName);
    } finally {
      fs.unlinkSync(configurationFileName);
    }
  });

  it.only('Header and body changes', async () => {
    //
    const configurationFile = newConfigurationFile();
    const configurationFileName = saveFile(configurationFile);

    try {
      await uploadTestFileAsync(configurationFileName, testBucketName);

      configurationFile.header.description = nanoid(10);
      configurationFile.body.incomeMultiplier += 1;
      saveFile(configurationFile);

      await waitAsync(3);

      await uploadTestFileAsync(configurationFileName, testBucketName);
    } finally {
      fs.unlinkSync(configurationFileName);
    }
  }).timeout(60 * 1000);

  it('Header only changes', async () => {
    await uploadTestFileAsync('ConfigInitial.json', testBucketName);
    await uploadTestFileAsync('ConfigHeaderOnly.json', testBucketName);
  });

  it('Body only changes', async () => {
    await uploadTestFileAsync('ConfigInitial.json', testBucketName);
    await uploadTestFileAsync('ConfigBodyOnly.json', testBucketName);
  });
});

function saveFile(file: File<Configuration>): string {
  //
  const fileName = `${file.header.name}.json`;
  fs.writeFileSync(fileName, JSON.stringify(file));
  return fileName;
}

function newConfigurationFile(): File<Configuration> {
  //
  const configurationName = `Configuration_${nanoid(10)}`;

  const configFile: File<Configuration> = {
    header: {
      fileType: FileType.Configuration,
      name: configurationName,
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

async function execCommand(command: string): Promise<string | child.ExecException> {
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
