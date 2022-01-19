/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/prefer-default-export */
// import AWS from 'aws-sdk';

export const CREDIT_REFERENCE_URL_ENV_VAR = 'CREDIT_REFERENCE_URL';

// const ssm = new AWS.SSM();

export const handler = async (event: any): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  // const creditReferenceUrlParameterName =
  //   process.env[CREDIT_REFERENCE_URL_ENV_VAR] ?? '<undefined>';

  // const parameter = await ssm
  //   .getParameter({
  //     Name: creditReferenceUrlParameterName,
  //     WithDecryption: true,
  //   })
  //   .promise();

  // console.log(JSON.stringify({ parameterValue: parameter.Parameter?.Value }, null, 2));
};
