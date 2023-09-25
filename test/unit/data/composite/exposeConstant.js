import t from 'tap';

import {
  compositeFrom,
  continuationSymbol,
  exposeConstant,
  input,
} from '#composite';

t.test(`exposeConstant: basic behavior`, t => {
  t.plan(2);

  const composite1 = compositeFrom({
    compose: false,

    steps: [
      exposeConstant({
        value: input.value('foo'),
      }),
    ],
  });

  t.match(composite1, {
    expose: {
      dependencies: [],
    },
  });

  t.equal(composite1.expose.compute(), 'foo');
});

t.test(`exposeConstant: validate inputs`, t => {
  t.plan(2);

  let caughtError;

  try {
    caughtError = null;
    exposeConstant({});
  } catch (error) {
    caughtError = error;
  }

  t.match(caughtError, {
    errors: [/Required these inputs: value/],
  });

  try {
    caughtError = null;
    exposeConstant({
      value: 'some dependency',
    });
  } catch (error) {
    caughtError = error;
  }

  t.match(caughtError, {
    errors: [/Expected static values: value/],
  });
});
