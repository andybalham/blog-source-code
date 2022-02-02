/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/prefer-default-export */
import AWS from 'aws-sdk';
import axios, { AxiosResponse } from 'axios';
import { CreditReferenceRequest, CreditReferenceResponse } from './contracts/credit-reference';

export const CREDIT_REFERENCE_URL_PARAMETER_NAME_ENV_VAR = 'CREDIT_REFERENCE_URL_PARAMETER_NAME';

const ssm = new AWS.SSM();

// TODO: Instrument with https://github.com/awslabs/aws-embedded-metrics-node

export const handler = async (event: any): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  const creditReferenceUrlParameterName = process.env[CREDIT_REFERENCE_URL_PARAMETER_NAME_ENV_VAR];

  if (creditReferenceUrlParameterName === undefined)
    throw new Error('creditReferenceUrlParameterName === undefined');

  const creditReferenceUrlParameter = await ssm
    .getParameter({
      Name: creditReferenceUrlParameterName,
      WithDecryption: true,
    })
    .promise();

  const creditReferenceUrl = creditReferenceUrlParameter.Parameter?.Value;

  console.log(JSON.stringify({ creditReferenceUrl }, null, 2));

  if (creditReferenceUrl === undefined) throw new Error('creditReferenceUrl === undefined');

  const request: CreditReferenceRequest = {
    firstName: 'Trevor',
    lastName: 'Potato',
    postcode: 'MK3 9SE',
  };

  try {
    const res = await axios.post<
      CreditReferenceResponse,
      AxiosResponse<CreditReferenceResponse>,
      CreditReferenceRequest
    >(`${creditReferenceUrl}request`, request);
    console.log(res.data);
    return { status: res.status, data: res.data };
  } catch (err) {
    console.error(err);
    return err;
  }
};
