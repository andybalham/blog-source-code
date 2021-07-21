/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable import/no-extraneous-dependencies */
import S3, { GetObjectRequest } from 'aws-sdk/clients/s3';
import {
  File,
  Scenario,
  Configuration,
  Result,
  FileType,
} from '../contracts';

const fileBucketName = process.env.FILE_BUCKET_NAME;
const s3 = new S3();

// eslint-disable-next-line import/prefer-default-export
export const handler = async (event: {
  scenariosS3Key: string;
  configurationS3Key: string;
}): Promise<void> => {
  //
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ event }, null, 2));

  if (fileBucketName === undefined) throw new Error('fileBucketName === undefined');

  const { scenariosS3Key, configurationS3Key } = event;

  const scenarioFile = await getFileAsync<Scenario>(scenariosS3Key);
  const configurationFile = await getFileAsync<Configuration>(configurationS3Key);

  const resultFile: File<Result> = {
    header: {
      fileType: FileType.Result,
      name: `Scenario: ${scenarioFile.header.name}, Configuration: ${configurationFile.header.name}`,
    },
    body: {
      applicableIncome: scenarioFile.body.income * configurationFile.body.incomeMultiplier,
    },
  };

  await s3
    .upload({
      Bucket: fileBucketName,
      Key: `S-${scenariosS3Key}-C-${configurationS3Key}`,
      Body: JSON.stringify(resultFile),
    })
    .promise();
};

async function getFileAsync<T>(s3Key: string): Promise<File<T>> {
  //
  if (fileBucketName === undefined) throw new Error('fileBucketName === undefined');

  const getObjectRequest: GetObjectRequest = {
    Bucket: fileBucketName,
    Key: s3Key,
  };

  const getObjectOutput = await s3.getObject(getObjectRequest).promise();

  if (getObjectOutput.Body === undefined) {
    throw new Error(`GetObjectOutput.Body is undefined: ${JSON.stringify(getObjectRequest)}`);
  }

  const file = JSON.parse(getObjectOutput.Body.toString('utf-8')) as File<T>;

  return file;
}
