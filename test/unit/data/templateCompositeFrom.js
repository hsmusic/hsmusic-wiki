import t from 'tap';

import {isString} from '#validators';

import {
  compositeFrom,
  continuationSymbol,
  input,
  templateCompositeFrom,
} from '#composite';

t.test(`templateCompositeFrom: basic behavior`, t => {
  t.plan(1);

  const myCoolUtility = templateCompositeFrom({
    annotation: `myCoolUtility`,

    inputs: {
      foo: input(),
    },

    outputs: ['#bar'],

    steps: () => [
      {
        dependencies: [input('foo')],
        compute: (continuation, {
          [input('foo')]: foo,
        }) => continuation({
          ['#bar']: (typeof foo).toUpperCase()
        }),
      },
    ],
  });

  const instantiatedTemplate = myCoolUtility({
    foo: 'color',
  });

  t.match(instantiatedTemplate.toDescription(), {
    annotation: `myCoolUtility`,

    inputMapping: {
      foo: input.dependency('color'),
    },

    inputDescriptions: {
      foo: input(),
    },

    outputs: {
      '#bar': '#bar',
    },

    steps: Function,
  });
});

t.test(`templateCompositeFrom: validate static input values`, t => {
  t.plan(3);

  const stub = {
    annotation: 'stubComposite',
    outputs: ['#result'],
    steps: () => [{compute: continuation => continuation({'#result': 'OK'})}],
  };

  const quickThrows = (t, composite, inputOptions, ...errorMessages) =>
    t.throws(
      () => composite(inputOptions),
      {
        message: `Errors in input options passed to stubComposite`,
        errors: errorMessages.map(message => ({message})),
      });

  t.test(`templateCompositeFrom: validate input token shapes`, t => {
    t.plan(15);

    const template1 = templateCompositeFrom({
      ...stub, inputs: {
        foo: input(),
      },
    });

    t.doesNotThrow(
      () => template1({foo: 'dependency'}));

    t.doesNotThrow(
      () => template1({foo: input.dependency('dependency')}));

    t.doesNotThrow(
      () => template1({foo: input.value('static value')}));

    t.doesNotThrow(
      () => template1({foo: input('outerInput')}));

    t.doesNotThrow(
      () => template1({foo: input.updateValue()}));

    t.doesNotThrow(
      () => template1({foo: input.myself()}));

    quickThrows(t, template1,
      {foo: input.staticValue()},
      `foo: Expected dependency name or value-providing input() call, got input.staticValue`);

    quickThrows(t, template1,
      {foo: input.staticDependency()},
      `foo: Expected dependency name or value-providing input() call, got input.staticDependency`);

    const template2 = templateCompositeFrom({
      ...stub, inputs: {
        bar: input.staticDependency(),
      },
    });

    t.doesNotThrow(
      () => template2({bar: 'dependency'}));

    t.doesNotThrow(
      () => template2({bar: input.dependency('dependency')}));

    quickThrows(t, template2,
      {bar: input.value(123)},
      `bar: Expected dependency name, got input.value`);

    quickThrows(t, template2,
      {bar: input('outOfPlace')},
      `bar: Expected dependency name, got input`);

    const template3 = templateCompositeFrom({
      ...stub, inputs: {
        baz: input.staticValue(),
      },
    });

    t.doesNotThrow(
      () => template3({baz: input.value(1025)}));

    quickThrows(t, template3,
      {baz: 'dependency'},
      `baz: Expected input.value() call, got dependency name`);

    quickThrows(t, template3,
      {baz: input('outOfPlace')},
      `baz: Expected input.value() call, got input() call`);
  });

  t.test(`templateCompositeFrom: validate missing / misplaced inputs`, t => {
    t.plan(1);

    const template = templateCompositeFrom({
      ...stub, inputs: {
        foo: input(),
        bar: input(),
      },
    });

    t.throws(
      () => template({
        baz: 'aeiou',
        raz: input.value(123),
      }),
      {message: `Errors in input options passed to stubComposite`, errors: [
        {message: `Unexpected input names: baz, raz`},
        {message: `Required these inputs: foo, bar`},
      ]});
  });

  t.test(`templateCompositeFrom: validate acceptsNull / defaultValue: null`, t => {
    t.plan(3);

    const template1 = templateCompositeFrom({
      ...stub, inputs: {
        foo: input(),
      },
    });

    t.throws(
      () => template1({}),
      {message: `Errors in input options passed to stubComposite`, errors: [
        {message: `Required these inputs: foo`},
      ]},
      `throws if input missing and not marked specially`);

    const template2 = templateCompositeFrom({
      ...stub, inputs: {
        bar: input({acceptsNull: true}),
      },
    });

    t.throws(
      () => template2({}),
      {message: `Errors in input options passed to stubComposite`, errors: [
        {message: `Required these inputs: bar`},
      ]},
      `throws if input missing even if marked {acceptsNull}`);

    const template3 = templateCompositeFrom({
      ...stub, inputs: {
        baz: input({defaultValue: null}),
      },
    });

    t.doesNotThrow(
      () => template3({}),
      `does not throw if input missing if marked {defaultValue: null}`);
  });
});
