/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/prefer-default-export */
import axios from 'axios';

export const CREDIT_REFERENCE_URL_ENV_VAR = 'CREDIT_REFERENCE_URL';

export const handler = async (event: any): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  const creditReferenceUrl = process.env[CREDIT_REFERENCE_URL_ENV_VAR];

  if (creditReferenceUrl === undefined) throw new Error('creditReferenceUrl === undefined');

  try {
    const res = await axios.post(`${creditReferenceUrl}request`, {
      name: 'Atta',
      job: 'Freelance Developer',
    });
    console.log(res.data);
  } catch (err) {
    console.error(err);
  }
};
