/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/prefer-default-export */

export const handler = async (event: any): Promise<any> => {
  //
  console.log(JSON.stringify({ event }, null, 2));
};
