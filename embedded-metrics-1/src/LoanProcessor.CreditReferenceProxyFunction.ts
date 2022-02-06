/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/prefer-default-export */
import { metricScope, Unit } from 'aws-embedded-metrics';
import AWS from 'aws-sdk';
import axios, { AxiosResponse } from 'axios';
import { nanoid } from 'nanoid';
import { CreditReferenceRequest, CreditReferenceResponse } from './contracts/credit-reference';

export const CREDIT_REFERENCE_URL_PARAMETER_NAME_ENV_VAR = 'CREDIT_REFERENCE_URL_PARAMETER_NAME';

const ssm = new AWS.SSM();

// TODO: Instrument with https://github.com/awslabs/aws-embedded-metrics-node

const endpointUrlParameterName = process.env[CREDIT_REFERENCE_URL_PARAMETER_NAME_ENV_VAR];

let endpointUrl: string | undefined;

async function refreshEndpointUrlAsync(): Promise<boolean> {
  //
  if (endpointUrlParameterName === undefined)
    throw new Error('endpointUrlParameterName === undefined');

  const endpointUrlParameter = await ssm
    .getParameter({
      Name: endpointUrlParameterName,
      WithDecryption: true,
    })
    .promise();

  const isRefreshed = endpointUrlParameter.Parameter?.Value !== endpointUrl;

  endpointUrl = endpointUrlParameter.Parameter?.Value;
  console.log(JSON.stringify({ creditReferenceUrl: endpointUrl }, null, 2));

  return isRefreshed;
}

const callEndpointAsync = metricScope(
  (metrics) =>
    async (request: CreditReferenceRequest): Promise<AxiosResponse<CreditReferenceResponse>> => {
      //
      if (endpointUrl === undefined) throw new Error('endpointUrl === undefined');

      const startTime = Date.now();

      try {
        const response = await axios.post<
          CreditReferenceResponse,
          AxiosResponse<CreditReferenceResponse>,
          CreditReferenceRequest
        >(`${endpointUrl}request`, request);

        const responseTime = Date.now() - startTime;

        metrics.putDimensions({ Service: 'CreditReferenceGateway' });
        metrics.putMetric('ResponseTime', responseTime, Unit.Milliseconds);
        metrics.setProperty('ResponseStatus', response.status);
        metrics.setProperty('CorrelationId', request.correlationId);
        metrics.setProperty('RequestId', request.requestId);

        return response;
        //
      } catch (error: any) {
        const responseTime = Date.now() - startTime;

        metrics.putDimensions({ Service: 'CreditReferenceGateway' });
        metrics.putMetric('ResponseTime', responseTime, Unit.Milliseconds);
        metrics.putMetric('ErrorCount', 1, Unit.Count);
        if (error.response?.status) metrics.setProperty('ResponseStatus', error.response.status);
        metrics.setProperty('CorrelationId', request.correlationId);
        metrics.setProperty('RequestId', request.requestId);

        throw error;
      }
    }
);

// const callEndpointAsync = async (
//   request: CreditReferenceRequest
// ): Promise<AxiosResponse<CreditReferenceResponse>> => {
//   //
//   if (endpointUrl === undefined) throw new Error('endpointUrl === undefined');

//   return axios.post<
//     CreditReferenceResponse,
//     AxiosResponse<CreditReferenceResponse>,
//     CreditReferenceRequest
//   >(`${endpointUrl}request`, request);
// };

export const handler = async (event: any): Promise<any> => {
  //
  console.log(JSON.stringify({ event }, null, 2));

  await refreshEndpointUrlAsync();

  const request: CreditReferenceRequest = {
    correlationId: event.correlationId,
    requestId: nanoid(),
    firstName: 'Trevor',
    lastName: 'Potato',
    postcode: 'MK3 9SE',
  };

  let httpResponse = await callEndpointAsync(request);

  if (httpResponse.status === 404) {
    //
    const isEndpointUrlRefreshed = await refreshEndpointUrlAsync();

    if (isEndpointUrlRefreshed) {
      httpResponse = await callEndpointAsync(request);
    }
  }

  return { status: httpResponse.status, data: httpResponse.data };
};
