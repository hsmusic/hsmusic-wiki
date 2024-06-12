import t from 'tap';
import {quickCheckCompositeOutputs} from '#test-lib';

import {compositeFrom, input} from '#composite';
import {exposeDependency} from '#composite/control-flow';
import {withUniqueItemsOnly} from '#composite/data';

t.test(`withUniqueItemsOnly: basic behavior`, t => {
  t.plan(3);

  const composite = compositeFrom({
    compose: false,

    steps: [
      withUniqueItemsOnly({
        list: 'list',
      }),

      exposeDependency({dependency: '#list'}),
    ],
  });

  t.match(composite, {
    expose: {
      dependencies: ['list'],
    },
  });

  t.same(composite.expose.compute({
    list: ['apple', 'banana', 'banana', 'banana', 'apple', 'watermelon'],
  }), ['apple', 'banana', 'watermelon']);

  t.same(composite.expose.compute({
    list: [],
  }), []);
});

t.test(`withUniqueItemsOnly: output shapes & values`, t => {
  t.plan(2 * 3 ** 1);

  const dependencies = {
    ['list_dependency']:
      [1, 1, 2, 3, 3, 4, 'foo', false, false, 4],
    [input('list_neither')]:
      [8, 8, 7, 6, 6, 5, 'bar', true, true, 5],
  };

  const qcco = quickCheckCompositeOutputs(t, dependencies);

  const mapLevel1 = [
    ['list_dependency', {
      '#list_dependency': [1, 2, 3, 4, 'foo', false],
    }],
    [input.value([-1, -1, 'interesting', 'very', 'interesting']), {
      '#uniqueItems': [-1, 'interesting', 'very'],
    }],
    [input('list_neither'), {
      '#uniqueItems': [8, 7, 6, 5, 'bar', true],
    }],
  ];

  for (const [listInput, outputDict] of mapLevel1) {
    const step = withUniqueItemsOnly({
      list: listInput,
    });

    qcco(step, outputDict);
  }
});
