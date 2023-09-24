import t from 'tap';

import {
  compositeFrom,
  continuationSymbol,
  exposeDependency,
  input,
} from '#composite';

t.test(`exposeDependency: basic behavior`, t => {
  t.plan(4);

  const composite1 = compositeFrom({
    compose: false,

    steps: [
      exposeDependency({dependency: 'foo'}),
    ],
  });

  t.match(composite1, {
    expose: {
      dependencies: ['foo'],
    },
  });

  t.equal(composite1.expose.compute({foo: 'bar'}), 'bar');

  const composite2 = compositeFrom({
    compose: false,

    steps: [
      {
        dependencies: ['foo'],
        compute: (continuation, {foo}) =>
          continuation({'#bar': foo.toUpperCase()}),
      },

      exposeDependency({dependency: '#bar'}),
    ],
  });

  t.match(composite2, {
    expose: {
      dependencies: ['foo'],
    },
  });

  t.equal(composite2.expose.compute({foo: 'bar'}), 'BAR');
});

t.test(`exposeDependency: validate inputs`, t => {
  t.plan(2);

  let caughtError;

  try {
    caughtError = null;
    exposeDependency({});
  } catch (error) {
    caughtError = error;
  }

  t.match(caughtError, {
    errors: [/Required these inputs: dependency/],
  });

  try {
    caughtError = null;
    exposeDependency({
      dependency: input.value('some static value'),
    });
  } catch (error) {
    caughtError = error;
  }

  t.match(caughtError, {
    errors: [/Expected static dependencies: dependency/],
  });
});
