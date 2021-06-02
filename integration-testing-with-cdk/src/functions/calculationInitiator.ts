// eslint-disable-next-line import/prefer-default-export
export const handler = async (event: any = {}): Promise<any> => {
  // eslint-disable-next-line no-console
  console.log('Hello World!');
  const response = JSON.stringify(event, null, 2);
  return response;
};
