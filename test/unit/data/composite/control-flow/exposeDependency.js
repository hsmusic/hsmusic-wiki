import t from 'tap';

import {compositeFrom, continuationSymbol, input} from '#composite';
import {exposeDependency} from '#composite/control-flow';

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

  t.throws(
    () => exposeDependency({}),
    {message: `Errors in input options passed to exposeDependency`, errors: [
      {message: `Required these inputs: dependency`},
    ]});

  t.throws(
    () => exposeDependency({
      dependency: input.value('some static value'),
    }),
    {message: `Errors in input options passed to exposeDependency`, errors: [
      {message: `dependency: Expected dependency name, got input.value() call`},
    ]});
});
