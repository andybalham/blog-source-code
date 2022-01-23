/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/prefer-default-export */
import AWS from 'aws-sdk';
import axios from 'axios';

// export const CREDIT_REFERENCE_URL_ENV_VAR = 'CREDIT_REFERENCE_URL';
export const CREDIT_REFERENCE_URL_PARAMETER_NAME_ENV_VAR = 'CREDIT_REFERENCE_URL_PARAMETER_NAME';

const ssm = new AWS.SSM();

export const handler = async (event: any): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  const creditReferenceUrlParameterName =
    process.env[CREDIT_REFERENCE_URL_PARAMETER_NAME_ENV_VAR] ?? '<undefined>';

  const creditReferenceUrlParameter = await ssm
    .getParameter({
      Name: creditReferenceUrlParameterName,
      WithDecryption: true,
    })
    .promise();

  const creditReferenceUrl = creditReferenceUrlParameter.Parameter?.Value;

  if (creditReferenceUrl === undefined) throw new Error('creditReferenceUrl === undefined');

  console.log(JSON.stringify({ creditReferenceUrl }, null, 2));

  try {
    const res = await axios.post(`${creditReferenceUrl}request`, {
      name: 'Trevor Potato',
      job: 'Freelance Developer',
    });
    console.log(res.data);
  } catch (err) {
    console.error(err);
  }
};
