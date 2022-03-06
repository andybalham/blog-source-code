/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/prefer-default-export */
import { metricScope } from 'aws-embedded-metrics';
import AWS from 'aws-sdk';
import axios, { AxiosResponse } from 'axios';
import { nanoid } from 'nanoid';
import { IdentityCheckRequest, IdentityCheckResponse } from '../contracts/identity-check';

export const IDENTITY_CHECK_URL_PARAMETER_NAME_ENV_VAR = 'IDENTITY_CHECK_URL_PARAMETER_NAME';

const ssm = new AWS.SSM();

const endpointUrlParameterName = process.env[IDENTITY_CHECK_URL_PARAMETER_NAME_ENV_VAR];

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
  console.log(JSON.stringify({ identityCheckUrl: endpointUrl }, null, 2));

  return isRefreshed;
}

const callEndpointAsync = metricScope(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (metrics) =>
    async (
      serviceName: string,
      request: IdentityCheckRequest
    ): Promise<AxiosResponse<IdentityCheckResponse>> => {
      //
      if (endpointUrl === undefined) throw new Error('endpointUrl === undefined');

      const startTime = Date.now();

      const response = await axios.post<
        IdentityCheckResponse,
        AxiosResponse<IdentityCheckResponse>,
        IdentityCheckRequest
      >(`${endpointUrl}request`, request);

      const responseTime = Date.now() - startTime;

      console.log(
        JSON.stringify(
          {
            Service: serviceName,
            CorrelationId: request.correlationId,
            RequestId: request.requestId,
            ResponseTime: responseTime,
            ResponseStatusCode: response.status,
          },
          null,
          2
        )
      );

      // metrics
      //   .putDimensions({ Service: serviceName })
      //   .putMetric('ResponseTime', responseTime, Unit.Milliseconds)
      //   .setProperty('CorrelationId', request.correlationId)
      //   .setProperty('RequestId', request.requestId);

      return response;
    }
);

export const handler = async (event: any): Promise<any> => {
  //
  console.log(JSON.stringify({ event }, null, 2));

  await refreshEndpointUrlAsync(endpointUrlParameterName);

  const request: IdentityCheckRequest = {
    correlationId: event.correlationId,
    requestId: nanoid(),
    firstName: event.firstName,
    lastName: event.lastName,
    postcode: event.postcode,
  };

  const serviceName = 'IdentityCheckGateway';

  let httpResponse = await callEndpointAsync(serviceName, request);

  if (httpResponse.status === 404) {
    //
    const isEndpointUrlRefreshed = await refreshEndpointUrlAsync(endpointUrlParameterName);

    if (isEndpointUrlRefreshed) {
      httpResponse = await callEndpointAsync(serviceName, request);
    }
  }

  return { status: httpResponse.status, data: httpResponse.data };
};
