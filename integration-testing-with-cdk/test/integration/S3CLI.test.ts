/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-use-before-define */
import * as child from 'child_process';
import path from 'path';

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
    await uploadTestFile('ConfigInitial.json', testBucketName);
    await uploadTestFile('ConfigInitial.json', testBucketName);
  });

  it('Header and body changes', async () => {
    await uploadTestFile('ConfigInitial.json', testBucketName);
    await uploadTestFile('ConfigHeaderAndBody.json', testBucketName);
  });

  it('Header only changes', async () => {
    await uploadTestFile('ConfigInitial.json', testBucketName);
    await uploadTestFile('ConfigHeaderOnly.json', testBucketName);
  });

  it('Body only changes', async () => {
    await uploadTestFile('ConfigInitial.json', testBucketName);
    await uploadTestFile('ConfigBodyOnly.json', testBucketName);
  });
});

async function uploadTestFile(testFileName: string, testBucketName: string): Promise<void> {
  const testFilePath = path.join(__dirname, '..', 'data', testFileName);
  const uploadTestFileCommand = `aws s3 cp ${testFilePath} s3://${testBucketName}`;
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
