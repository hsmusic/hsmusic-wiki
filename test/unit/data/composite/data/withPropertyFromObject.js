import t from 'tap';

import {compositeFrom, input} from '#composite';
import {exposeDependency} from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';

t.test(`withPropertyFromObject: basic behavior`, t => {
  t.plan(4);

  const composite = compositeFrom({
    compose: false,

    steps: [
      withPropertyFromObject({
        object: 'object',
        property: 'property',
      }),

      exposeDependency({dependency: '#value'}),
    ],
  });

  t.match(composite, {
    expose: {
      dependencies: ['object', 'property'],
    },
  });

  t.equal(composite.expose.compute({
    object: {foo: 'bar', bim: 'BOOM'},
    property: 'bim',
  }), 'BOOM');

  t.equal(composite.expose.compute({
    object: {value1: 'uwah'},
    property: 'value2',
  }), null);

  t.equal(composite.expose.compute({
    object: null,
    property: 'oml where did me object go',
  }), null);
});

t.test(`withPropertyFromObject: output shapes & values`, t => {
  t.plan(2 * 3 ** 2);

  const dependencies = {
    ['object_dependency']:
      {foo: 'apple', bar: 'banana', baz: 'orange'},
    [input('object_neither')]:
      {foo: 'koala', bar: 'okapi', baz: 'mongoose'},
    ['property_dependency']:
      'foo',
    [input('property_neither')]:
      'baz',
  };

  const mapLevel1 = [
    ['object_dependency', [
      ['property_dependency', {
        '#value': 'apple',
      }],
      [input.value('bar'), {
        '#object_dependency.bar': 'banana',
      }],
      [input('property_neither'), {
        '#value': 'orange',
      }]]],

    [input.value({foo: 'ouh', bar: 'rah', baz: 'nyu'}), [
      ['property_dependency', {
        '#value': 'ouh',
      }],
      [input.value('bar'), {
        '#value': 'rah',
      }],
      [input('property_neither'), {
        '#value': 'nyu',
      }]]],

    [input('object_neither'), [
      ['property_dependency', {
        '#value': 'koala',
      }],
      [input.value('bar'), {
        '#value': 'okapi',
      }],
      [input('property_neither'), {
        '#value': 'mongoose',
      }]]],
  ];

  for (const [objectInput, mapLevel2] of mapLevel1) {
    for (const [propertyInput, outputDict] of mapLevel2) {
      const step = withPropertyFromObject({
        object: objectInput,
        property: propertyInput,
      });

      quickCheckOutputs(step, outputDict);
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
