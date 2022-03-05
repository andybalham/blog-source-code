/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-use-before-define */

import { expect } from 'chai';
import { makeHashedClone, NUMBER_DEFAULT } from '../src/hash-cloner';

describe('Hash Cloner Test Suite', () => {
  it('can anonymise data types', async () => {
    //
    const data = {
      sortCode: '307415',
    };

    const anonymousData = makeHashedClone(data);

    expect(anonymousData.sortCode).to.equal('XXXXXX');
  });

  it('can hash data types', async () => {
    //
    const data = {
      firstName: 'Trevor',
      sortCode: 307415,
    };

    const anonymousData = makeHashedClone(data);

    expect(anonymousData.firstName).to.equal('81ed14');
    expect(anonymousData.sortCode).to.equal(NUMBER_DEFAULT);
  });

  it('can hash child objects', async () => {
    //
    const data = {
      childObject: {
        firstName: 'Trevor',
        sortCode: 307415,
      },
    };

    const anonymousData = makeHashedClone(data);

    expect(anonymousData.childObject.firstName).to.equal('81ed14');
    expect(anonymousData.childObject.sortCode).to.equal(NUMBER_DEFAULT);
  });

  it('can hash array objects', async () => {
    //
    const data = {
      childArray: [
        {
          firstName: 'Trevor',
          sortCode: 307415,
        },
      ],
    };

    const anonymousData = makeHashedClone(data);

    expect(anonymousData.childArray[0].firstName).to.equal('81ed14');
    expect(anonymousData.childArray[0].sortCode).to.equal(NUMBER_DEFAULT);
  });

  it.skip('can hash data', async () => {
    //
    const data = {
      firstName: 'Trevor',
      lastName: 'Potato',
      addresses: [
        {
          addressLine1: '999 Letsby Avenue',
          postcode: 'PI9 G99',
        },
      ],
      bankDetails: {
        sortCode: 307415,
      },
    };

    const anonymousData = makeHashedClone(data);

    console.log(JSON.stringify(anonymousData, null, 2));
  });
});
