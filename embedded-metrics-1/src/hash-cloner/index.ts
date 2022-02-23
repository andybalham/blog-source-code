/* eslint-disable @typescript-eslint/no-use-before-define */
import * as crypto from 'crypto';

export const NUMBER_DEFAULT = 9999;

const anonymousKeyMap: Record<string, boolean> = {
  DOB: true,
  DATEOFBIRTH: true,
  NINUMBER: true,
  ACCOUNTHOLDER: true,
  ACCOUNTNAME: true,
  ACCOUNTNO: true,
  ACCOUNTNUMBER: true,
  SORTCODE: true,
  IBAN: true,
  BIC: true,
};

const sensitiveKeyMap: Record<string, boolean> = {
  NAME: true,
  NAMES: true,
  FIRSTNAME: true,
  MIDDLENAME: true,
  LASTNAME: true,
  FORENAME: true,
  FORENAMES: true,
  SURNAME: true,
  OTHERNAMES: true,
  ADDRESSLINE1: true,
  POSTCODE: true,
};

export function addAnonymousKeys(...keys: string[]): void {
  keys.forEach((key) => {
    anonymousKeyMap[key.toLocaleUpperCase()] = true;
  });
}

export function addSensitiveKeys(...keys: string[]): void {
  keys.forEach((key) => {
    sensitiveKeyMap[key.toLocaleUpperCase()] = true;
  });
}

export function makeHashedClone<T>(input: T): T {
  //
  const clone = JSON.parse(JSON.stringify(input));

  replaceKeys(clone);

  return clone;
}

function replaceKeys(obj: Record<string, any>): void {
  //
  // eslint-disable-next-line no-restricted-syntax
  for (const [key, value] of Object.entries(obj)) {
    //
    const typeofValue = typeof value;

    if (anonymousKeyMap[key.toLocaleUpperCase()]) {
      //
      if (typeofValue === 'string') {
        const hashedValue = getAnonymousString(value as string);
        // eslint-disable-next-line no-param-reassign
        obj[key] = hashedValue;
      } else if (typeofValue === 'number') {
        // eslint-disable-next-line no-param-reassign
        obj[key] = NUMBER_DEFAULT;
      }
    } else if (sensitiveKeyMap[key.toLocaleUpperCase()]) {
      //
      if (typeofValue === 'string') {
        const hashedValue = getHashedString(value as string);
        // eslint-disable-next-line no-param-reassign
        obj[key] = hashedValue;
      } else if (typeofValue === 'number') {
        // eslint-disable-next-line no-param-reassign
        obj[key] = NUMBER_DEFAULT;
      }
    }

    if (typeofValue === 'object') {
      replaceKeys(value);
    }
  }
}

function getHashedString(value: string): string {
  const hashedValue = crypto.createHash('sha256').update(value).digest('hex');
  const trimmedHashedValue = hashedValue.substring(0, Math.min(hashedValue.length, value.length));
  return trimmedHashedValue;
}

function getAnonymousString(value: string): string {
  const anonymousValue = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
  const trimmedAnonymousValue = anonymousValue.substring(
    0,
    Math.min(anonymousValue.length, value.length)
  );
  return trimmedAnonymousValue;
}
