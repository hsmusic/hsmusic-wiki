import t from 'tap';

import {
  compositeFrom,
  exposeDependency,
  input,
  withPropertiesFromObject,
} from '#composite';

const composite = compositeFrom({
  compose: false,

  steps: [
    withPropertiesFromObject({
      object: 'object',
      properties: 'properties',
    }),

    exposeDependency({dependency: '#object'}),
  ],
});

t.test(`withPropertiesFromObject: basic behavior`, t => {
  t.plan(4);

  t.match(composite, {
    expose: {
      dependencies: ['object', 'properties'],
    },
  });

  t.same(
    composite.expose.compute({
      object: {foo: 'bar', bim: 'BOOM', bam: 'baz'},
      properties: ['foo', 'bim'],
    }),
    {foo: 'bar', bim: 'BOOM'});

  t.same(
    composite.expose.compute({
      object: {value1: 'uwah', value2: 'arah'},
      properties: ['value1', 'value3'],
    }),
    {value1: 'uwah', value3: null});

  t.same(
    composite.expose.compute({
      object: null,
      properties: ['ohMe', 'ohMy', 'ohDear'],
    }),
    {ohMe: null, ohMy: null, ohDear: null});
});

t.test(`withPropertiesFromObject: output shapes & values`, t => {
  t.plan(2 * 2 * 3 ** 2);

  const dependencies = {
    ['object_dependency']:
      {foo: 'apple', bar: 'banana', baz: 'orange'},
    [input('object_neither')]:
      {foo: 'koala', bar: 'okapi', baz: 'mongoose'},
    ['properties_dependency']:
      ['foo', 'bar', 'missing1'],
    [input('properties_neither')]:
      ['foo', 'baz', 'missing3'],
  };

  const mapLevel1 = [
    [input.value('prefix_value'), [
      ['object_dependency', [
        ['properties_dependency', {
          '#object': {foo: 'apple', bar: 'banana', missing1: null},
        }],
        [input.value(['bar', 'baz', 'missing2']), {
          '#prefix_value.bar': 'banana',
          '#prefix_value.baz': 'orange',
          '#prefix_value.missing2': null,
        }],
        [input('properties_neither'), {
          '#object': {foo: 'apple', baz: 'orange', missing3: null},
        }]]],

      [input.value({foo: 'ouh', bar: 'rah', baz: 'nyu'}), [
        ['properties_dependency', {
          '#object': {foo: 'ouh', bar: 'rah', missing1: null},
        }],
        [input.value(['bar', 'baz', 'missing2']), {
          '#prefix_value.bar': 'rah',
          '#prefix_value.baz': 'nyu',
          '#prefix_value.missing2': null,
        }],
        [input('properties_neither'), {
          '#object': {foo: 'ouh', baz: 'nyu', missing3: null},
        }]]],

      [input('object_neither'), [
        ['properties_dependency', {
          '#object': {foo: 'koala', bar: 'okapi', missing1: null},
        }],
        [input.value(['bar', 'baz', 'missing2']), {
          '#prefix_value.bar': 'okapi',
          '#prefix_value.baz': 'mongoose',
          '#prefix_value.missing2': null,
        }],
        [input('properties_neither'), {
          '#object': {foo: 'koala', baz: 'mongoose', missing3: null},
        }]]]]],

    [input.value(null), [
      ['object_dependency', [
        ['properties_dependency', {
          '#object': {foo: 'apple', bar: 'banana', missing1: null},
        }],
        [input.value(['bar', 'baz', 'missing2']), {
          '#object_dependency.bar': 'banana',
          '#object_dependency.baz': 'orange',
          '#object_dependency.missing2': null,
        }],
        [input('properties_neither'), {
          '#object': {foo: 'apple', baz: 'orange', missing3: null},
        }]]],

      [input.value({foo: 'ouh', bar: 'rah', baz: 'nyu'}), [
        ['properties_dependency', {
          '#object': {foo: 'ouh', bar: 'rah', missing1: null},
        }],
        [input.value(['bar', 'baz', 'missing2']), {
          '#object.bar': 'rah',
          '#object.baz': 'nyu',
          '#object.missing2': null,
        }],
        [input('properties_neither'), {
          '#object': {foo: 'ouh', baz: 'nyu', missing3: null},
        }]]],

      [input('object_neither'), [
        ['properties_dependency', {
          '#object': {foo: 'koala', bar: 'okapi', missing1: null},
        }],
        [input.value(['bar', 'baz', 'missing2']), {
          '#object.bar': 'okapi',
          '#object.baz': 'mongoose',
          '#object.missing2': null,
        }],
        [input('properties_neither'), {
          '#object': {foo: 'koala', baz: 'mongoose', missing3: null},
        }]]]]],
  ];

  for (const [prefixInput, mapLevel2] of mapLevel1) {
    for (const [objectInput, mapLevel3] of mapLevel2) {
      for (const [propertiesInput, outputDict] of mapLevel3) {
        const step = withPropertiesFromObject({
          prefix: prefixInput,
          object: objectInput,
          properties: propertiesInput,
        });

        quickCheckOutputs(step, outputDict);
      }
    }
  }

  function quickCheckOutputs(step, outputDict) {
    t.same(
      Object.keys(step.toDescription().outputs),
      Object.keys(outputDict));

    const composite = compositeFrom({
      compose: false,
      steps: [step, {
        dependencies: Object.keys(outputDict),
        compute: dependencies => dependencies,
      }],
    });

    t.same(
      composite.expose.compute(dependencies),
      outputDict);
  }
});

t.test(`withPropertiesFromObject: validate static inputs`, t => {
  t.plan(3);

  t.throws(
    () => withPropertiesFromObject({}),
    {message: `Errors in input options passed to withPropertiesFromObject`, errors: [
      {message: `Required these inputs: object, properties`},
    ]});

  t.throws(
    () => withPropertiesFromObject({
      object: input.value('intriguing'),
      properties: input.value('very'),
      prefix: input.value({yes: 'yup'}),
    }),
    {message: `Errors in input options passed to withPropertiesFromObject`, errors: [
      {message: `object: Expected an object, got string`},
      {message: `properties: Expected an array, got string`},
      {message: `prefix: Expected a string, got object`},
    ]});

  t.throws(
    () => withPropertiesFromObject({
      object: input.value([['abc', 1], ['def', 2], [123, 3]]),
      properties: input.value(['abc', 'def', 123]),
    }),
    {message: `Errors in input options passed to withPropertiesFromObject`, errors: [
      {message: `object: Expected an object, got array`},
      {message: `properties: Errors validating array items`, errors: [
        {
          [Symbol.for('hsmusic.decorate.indexInSourceArray')]: 2,
          message: /Expected a string, got number/,
        },
      ]},
    ]});
});

t.test(`withPropertiesFromObject: validate dynamic inputs`, t => {
  t.plan(2);

  t.throws(
    () => composite.expose.compute({
      object: 'intriguing',
      properties: 'onceMore',
    }),
    {message: `Error computing composition`, cause:
      {message: `Error computing composition withPropertiesFromObject`, cause:
        {message: `Errors in input values provided to withPropertiesFromObject`, errors: [
          {message: `object: Expected an object, got string`},
          {message: `properties: Expected an array, got string`},
        ]}}});

  t.throws(
    () => composite.expose.compute({
      object: [['abc', 1], ['def', 2], [123, 3]],
      properties: ['abc', 'def', 123],
    }),
    {message: `Error computing composition`, cause:
      {message: `Error computing composition withPropertiesFromObject`, cause:
        {message: `Errors in input values provided to withPropertiesFromObject`, errors: [
          {message: `object: Expected an object, got array`},
          {message: `properties: Errors validating array items`, errors: [
            {
              [Symbol.for('hsmusic.decorate.indexInSourceArray')]: 2,
              message: /Expected a string, got number/,
            },
          ]},
        ]}}});
});
