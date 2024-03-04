import t from 'tap';
import {quickCheckCompositeOutputs} from '#test-lib';

import CacheableObject from '#cacheable-object';
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

t.test(`withPropertyFromObject: "internal" input`, t => {
  t.plan(7);

  const composite = compositeFrom({
    compose: false,

    steps: [
      withPropertyFromObject({
        object: 'object',
        property: 'property',
        internal: 'internal',
      }),

      exposeDependency({dependency: '#value'}),
    ],
  });

  const thing = new (class extends CacheableObject {
    static [CacheableObject.propertyDescriptors] = {
      foo: {
        flags: {update: true, expose: false},
      },

      bar: {
        flags: {update: true, expose: true},
      },

      baz: {
        flags: {update: true, expose: true},
        expose: {
          transform: baz => baz * 2,
        },
      },
    };
  });

  thing.foo = 100;
  thing.bar = 200;
  thing.baz = 300;

  t.match(composite, {
    expose: {
      dependencies: ['object', 'property', 'internal'],
    },
  });

  t.equal(composite.expose.compute({
    object: thing,
    property: 'foo',
    internal: true,
  }), 100);

  t.equal(composite.expose.compute({
    object: thing,
    property: 'bar',
    internal: true,
  }), 200);

  t.equal(composite.expose.compute({
    object: thing,
    property: 'baz',
    internal: true,
  }), 300);

  t.equal(composite.expose.compute({
    object: thing,
    property: 'baz',
    internal: false,
  }), 600);

  t.equal(composite.expose.compute({
    object: thing,
    property: 'bimbam',
    internal: false,
  }), null);

  t.equal(composite.expose.compute({
    object: null,
    property: 'bambim',
    internal: false,
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

  const qcco = quickCheckCompositeOutputs(t, dependencies);

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

      qcco(step, outputDict);
    }
  }
});
