/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/prefer-default-export */
import AWS from 'aws-sdk';
import axios, { AxiosResponse } from 'axios';
import { nanoid } from 'nanoid';
import { CreditReferenceRequest, CreditReferenceResponse } from '../contracts/credit-reference';
import { LoanProcessorState } from '../contracts/loan-processor';

export const CREDIT_REFERENCE_URL_PARAMETER_NAME_ENV_VAR = 'CREDIT_REFERENCE_URL_PARAMETER_NAME';

const ssm = new AWS.SSM();

const endpointUrlParameterName = process.env[CREDIT_REFERENCE_URL_PARAMETER_NAME_ENV_VAR];

let endpointUrl: string | undefined;

async function refreshEndpointUrlAsync(urlParameterName?: string): Promise<boolean> {
  //
  if (urlParameterName === undefined) throw new Error('urlParameterName === undefined');

  const endpointUrlParameter = await ssm
    .getParameter({
      Name: urlParameterName,
      WithDecryption: true,
    })
    .promise();

  const isRefreshed = endpointUrlParameter.Parameter?.Value !== endpointUrl;

  endpointUrl = endpointUrlParameter.Parameter?.Value;
  // console.log(JSON.stringify({ creditReferenceUrl: endpointUrl }, null, 2));

  return isRefreshed;
}

const callEndpointAsync = async (
  request: CreditReferenceRequest
): Promise<AxiosResponse<CreditReferenceResponse>> => {
  //
  if (endpointUrl === undefined) throw new Error('endpointUrl === undefined');

  const url = `${endpointUrl}request`;

  const response = await axios.post<
    CreditReferenceResponse,
    AxiosResponse<CreditReferenceResponse>,
    CreditReferenceRequest
  >(url, request);

  return response;
};

export const handler = async (state: LoanProcessorState): Promise<LoanProcessorState> => {
  //
  console.log(JSON.stringify({ event: state }, null, 2));

  if (state.creditReference) {
    console.log(`Skipping: state.creditReference already populated`);
    console.log(JSON.stringify({ state }, null, 2));
    return state;
  }

  await refreshEndpointUrlAsync(endpointUrlParameterName);

  const request: CreditReferenceRequest = {
    requestId: nanoid(),
    correlationId: state.correlationId,
    firstName: state.input.firstName,
    lastName: state.input.lastName,
    postcode: state.input.postcode,
  };

  let httpResponse = await callEndpointAsync(request);

  if (httpResponse.status === 404) {
    //
    const isEndpointUrlRefreshed = await refreshEndpointUrlAsync(endpointUrlParameterName);

    if (isEndpointUrlRefreshed) {
      httpResponse = await callEndpointAsync(request);
    }
  }

  if (httpResponse.status !== 200) {
    throw new Error(`Unexpected HTTP response: ${httpResponse.status}`);
  }

  // eslint-disable-next-line no-param-reassign
  state.creditReference = {
    creditReferenceRating: httpResponse.data.rating,
  };

  console.log(JSON.stringify({ state }, null, 2));

  return state;
};
