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

  t.throws(
    () => exposeConstant({}),
    {message: `Errors in input options passed to exposeConstant`, errors: [
      {message: `Required these inputs: value`},
    ]});

  t.throws(
    () => exposeConstant({value: 'some dependency'}),
    {message: `Errors in input options passed to exposeConstant`, errors: [
      {message: `value: Expected input.value() call, got dependency name`},
    ]});
});
