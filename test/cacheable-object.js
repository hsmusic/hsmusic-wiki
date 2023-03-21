import test from 'tape';

import CacheableObject from '../src/data/things/cacheable-object.js';

// Utility

function newCacheableObject(PD) {
  return new (class extends CacheableObject {
    static propertyDescriptors = PD;
  });
}

// Tests

test(`CacheableObject simple separate update & expose`, t => {
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

test(`CacheableObject basic cache behavior`, t => {
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

  t.is(computeCount, 0);

  obj.string = 'hello world';
  t.is(computeCount, 0);

  obj.karkat;
  t.is(computeCount, 1);

  obj.karkat;
  t.is(computeCount, 1);

  obj.string = 'testing once again';
  t.is(computeCount, 1);

  obj.karkat;
  t.is(computeCount, 2);

  obj.string = 'testing once again';
  t.is(computeCount, 2);

  obj.karkat;
  t.is(computeCount, 2);
});

test(`CacheableObject combined update & expose (no transform)`, t => {
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
  t.is(obj.directory, 'the-world-revolving');

  obj.directory = 'chaos-king';
  t.is(obj.directory, 'chaos-king');
});

test(`CacheableObject combined update & expose (basic transform)`, t => {
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
  t.is(obj.getsRepeated, 'dogdog');
});

test(`CacheableObject combined update & expose (transform with dependency)`, t => {
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
  t.is(obj.customRepeat, 'dog');

  obj.times = 5;
  t.is(obj.customRepeat, 'dogdogdogdogdog');

  obj.customRepeat = 'cat';
  t.is(obj.customRepeat, 'catcatcatcatcat');
});

test(`CacheableObject validate on update`, t => {
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
  t.is(obj.directory, 'megalovania');

  try {
    obj.directory = 25;
  } catch (err) {
    thrownError = err;
  }

  t.is(thrownError, mockError);
  t.is(obj.directory, 'megalovania');

  const date = new Date(`25 December 2009`);

  obj.date = date;
  t.is(obj.date, date);

  try {
    obj.date = `TWELFTH PERIGEE'S EVE`;
  } catch (err) {
    thrownError = err;
  }

  t.is(thrownError?.constructor, TypeError);
  t.is(obj.date, date);
});

test(`CacheableObject default update property value`, t => {
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
  t.is(obj.fruit, 'potassium');
});

test(`CacheableObject default property throws if invalid`, t => {
  const mockError = new TypeError(`Expected a string, not ${typeof value}`);

  t.plan(1);

  let thrownError;

  try {
    newCacheableObject({
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
    });
  } catch (err) {
    thrownError = err;
  }

  t.is(thrownError, mockError);
});
