import t from 'tap';

import {CacheableObject} from '#things';

function newCacheableObject(PD) {
  return new (class extends CacheableObject {
    static propertyDescriptors = PD;
  });
}

t.test(`CacheableObject simple separate update & expose`, t => {
  const obj = newCacheableObject({
    number: {
      flags: {
        update: true
      }
    },

    timesTwo: {
      flags: {
        expose: true
      },

      expose: {
        dependencies: ['number'],
        compute: ({ number }) => number * 2
      }
    }
  });

  t.plan(1);
  obj.number = 5;
  t.equal(obj.timesTwo, 10);
});

t.test(`CacheableObject basic cache behavior`, t => {
  let computeCount = 0;

  const obj = newCacheableObject({
    string: {
      flags: {
        update: true
      }
    },

    karkat: {
      flags: {
        expose: true
      },

      expose: {
        dependencies: ['string'],
        compute: ({ string }) => {
          computeCount++;
          return string.toUpperCase();
        }
      }
    }
  });

  t.plan(8);

  t.equal(computeCount, 0);

  obj.string = 'hello world';
  t.equal(computeCount, 0);

  obj.karkat;
  t.equal(computeCount, 1);

  obj.karkat;
  t.equal(computeCount, 1);

  obj.string = 'testing once again';
  t.equal(computeCount, 1);

  obj.karkat;
  t.equal(computeCount, 2);

  obj.string = 'testing once again';
  t.equal(computeCount, 2);

  obj.karkat;
  t.equal(computeCount, 2);
});

t.test(`CacheableObject combined update & expose (no transform)`, t => {
  const obj = newCacheableObject({
    directory: {
      flags: {
        update: true,
        expose: true
      }
    }
  });

  t.plan(2);

  obj.directory = 'the-world-revolving';
  t.equal(obj.directory, 'the-world-revolving');

  obj.directory = 'chaos-king';
  t.equal(obj.directory, 'chaos-king');
});

t.test(`CacheableObject combined update & expose (basic transform)`, t => {
  const obj = newCacheableObject({
    getsRepeated: {
      flags: {
        update: true,
        expose: true
      },

      expose: {
        transform: value => value.repeat(2)
      }
    }
  });

  t.plan(1);

  obj.getsRepeated = 'dog';
  t.equal(obj.getsRepeated, 'dogdog');
});

t.test(`CacheableObject combined update & expose (transform with dependency)`, t => {
  const obj = newCacheableObject({
    customRepeat: {
      flags: {
        update: true,
        expose: true
      },

      expose: {
        dependencies: ['times'],
        transform: (value, { times }) => value.repeat(times)
      }
    },

    times: {
      flags: {
        update: true
      }
    }
  });

  t.plan(3);

  obj.customRepeat = 'dog';
  obj.times = 1;
  t.equal(obj.customRepeat, 'dog');

  obj.times = 5;
  t.equal(obj.customRepeat, 'dogdogdogdogdog');

  obj.customRepeat = 'cat';
  t.equal(obj.customRepeat, 'catcatcatcatcat');
});

t.test(`CacheableObject validate on update`, t => {
  const mockError = new TypeError(`Expected a string, not ${typeof value}`);

  const obj = newCacheableObject({
    directory: {
      flags: {
        update: true,
        expose: true
      },

      update: {
        validate: value => {
          if (typeof value !== 'string') {
            throw mockError;
          }
          return true;
        }
      }
    },

    date: {
      flags: {
        update: true,
        expose: true
      },

      update: {
        validate: value => (value instanceof Date)
      }
    }
  });

  let thrownError;
  t.plan(6);

  obj.directory = 'megalovania';
  t.equal(obj.directory, 'megalovania');

  t.throws(
    () => { obj.directory = 25; },
    {cause: mockError});

  t.equal(obj.directory, 'megalovania');

  const date = new Date(`25 December 2009`);

  obj.date = date;
  t.equal(obj.date, date);

  t.throws(
    () => { obj.date = `TWELFTH PERIGEE'S EVE`; },
    {cause: TypeError});

  t.equal(obj.date, date);
});

t.test(`CacheableObject default update property value`, t => {
  const obj = newCacheableObject({
    fruit: {
      flags: {
        update: true,
        expose: true
      },

      update: {
        default: 'potassium'
      }
    }
  });

  t.plan(1);
  t.equal(obj.fruit, 'potassium');
});

t.test(`CacheableObject default property throws if invalid`, t => {
  const mockError = new TypeError(`Expected a string, not ${typeof value}`);

  t.plan(1);

  let thrownError;

  t.throws(
    () => newCacheableObject({
      string: {
        flags: {
          update: true
        },

        update: {
          default: 123,
          validate: value => {
            if (typeof value !== 'string') {
              throw mockError;
            }
            return true;
          }
        }
      }
    }),
    {cause: mockError});
});
