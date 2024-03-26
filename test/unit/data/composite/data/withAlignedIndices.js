import t from 'tap';

import {compositeFrom, input, debugComposite} from '#composite';
import {exposeDependency} from '#composite/control-flow';
import {withAlignedIndices, withAlignedList, withIndicesFromList}
  from '#composite/data';

const composite = compositeFrom({
  compose: false,

  steps: [
    withAlignedIndices({
      indices: 'indices',
      alignment: 'alignment',
    }),

    exposeDependency({dependency: '#alignedIndices'}),
  ],
});

t.test(`withAlignedIndices: basic behavior`, t => {
  t.plan(4);

  t.match(composite, {
    expose: {
      dependencies: ['indices', 'alignment'],
    },
  });

  t.same(
    composite.expose.compute({
      indices:   [0, 1, 2, 3],
      alignment: [3, 2, 1, 0],
    }),
    [3, 2, 1, 0]);

  t.same(
    composite.expose.compute({
      indices:   [0, 1, 2, 3],
      alignment: [0, 1, 2, 3],
    }),
    [0, 1, 2, 3]);

  t.same(
    composite.expose.compute({
      indices:   [3, 2, 1, 0],
      alignment: [0, 1, 2, 3],
    }),
    [0, 1, 2, 3]);
});

t.test(`withAlignedIndices: duplicate items in alignment`, t => {
  t.plan(3);

  t.same(
    composite.expose.compute({
      indices:   [0, 1, 2, 3],
      alignment: [0, 2, 1, 2],
    }),
    [0, 2, 1, 3]);

  t.same(
    composite.expose.compute({
      indices:   [1, 0, 2, 3],
      alignment: [0, 2, 1, 2],
    }),
    [0, 2, 1, 3]);

  t.same(
    composite.expose.compute({
      indices:   [0, 3, 2, 1],
      alignment: [0, 2, 1, 2],
    }),
    [0, 2, 3, 1]);
});

const sortComposite = compositeFrom({
  compose: false,

  steps: [
    withIndicesFromList({
      list: 'list',
    }),

    withAlignedIndices({
      indices: '#indices',
      alignment: 'alignment',
    }),

    withAlignedList({
      list: 'list',
      alignment: '#alignedIndices',
    }),

    exposeDependency({
      dependency: '#alignedList',
    }),
  ],
})

t.test(`withAlignedIndices: standard usage in sort`, t => {
  t.plan(2);

  t.match(sortComposite, {
    expose: {
      dependencies: ['list', 'alignment'],
    },
  });

  t.same(
    debugComposite(() => sortComposite.expose.compute({
      list:      ['apple', 'banana', 'pineapple', 'taco'],
      alignment: [2, 0, 1, 3],
    })),
    ['banana', 'pineapple', 'apple', 'taco']);

    desired:
    apple -> 2 -> be at 2
    banana -> 0 -> be at 0
    pineapple -> 1 -> be at 1
    taco -> 3 -> be at 3

    current:
    2 -> pineapple -> be at 0
    0 -> apple -> be at 1
    1 -> banana -> be at 2
    3 -> taco -> be at 3

    needed:
    1 -> banana -> be at 0
    2 -> pineapple -> be at 1
    0 -> apple -> be at 2
    3 -> taco -> be at 3

    sort:
      0 1 2 3
    f(2 0 1 3)
    = 1 2 0 3

  t.same(
    debugComposite(() => sortComposite.expose.compute({
      list:      ['apple', 'banana', 'pineapple', 'taco'],
      alignment: [2, 1, 0, 3],
    })),
    ['pineapple', 'banana', 'apple', 'taco']);


    desired:
    apple -> 2 -> be at 2
    banana -> 1 -> be at 1
    pineapple -> 0 -> be at 0
    taco -> 3 -> be at 3

    needed:
    2 -> pineapple -> be at 0
    1 -> banana -> be at 1
    0 -> apple -> be at 2
    3 -> taco -> be at 3

    sort:
      0 1 2 3
    f(2 1 0 3)
    = 2 1 0 3

  t.same(
    debugComposite(() => sortComposite.expose.compute({
      list:      ['apple', 'banana', 'pineapple', 'taco'],
      alignment: [0, 1, 2, 3],
    })),
    ['apple', 'banana', 'pineapple', 'taco']);

    desired:
    apple -> 0 -> be at 0
    banana -> 1 -> be at 1
    pineapple -> 2 -> be at 2
    taco -> 3 -> be at 3

    needed:
    0 -> apple -> be at 0
    1 -> banana -> be at 1
    2 -> pineapple -> be at 2
    3 -> taco -> be at 3

    sort:
      0 1 2 3
    f(0 1 2 3)
    = 0 1 2 3

  t.same(
    debugComposite(() => sortComposite.expose.compute({
      list:      ['apple', 'banana', 'pineapple', 'taco'],
      alignment: [3, 2, 1, 0],
    })),
    ['apple', 'banana', 'pineapple', 'taco']);

    desired:
    apple -> 3 -> be at 3
    banana -> 2 -> be at 2
    pineapple -> 1 -> be at 1
    taco -> 0 -> be at 0

    needed:
    3 -> taco -> be at 0
    2 -> pineapple -> be at 1
    1 -> banana -> be at 2
    0 -> apple -> be at 3

    sort:
      0 1 2 3
    f(3 2 1 0)
    = 3 2 1 0

  t.same(
    debugComposite(() => sortComposite.expose.compute({
      list:      ['apple', 'banana', 'pineapple', 'taco'],
      alignment: [2, 3, 1, 0],
    })),
    ['taco', 'pineapple', 'apple', 'banana']);

    desired:
    apple -> 2 -> be at 2
    banana -> 3 -> be at 3
    pineapple -> 1 -> be at 1
    taco -> 0 -> be at 0

    needed:
    3 -> taco -> be at 0
    2 -> pineapple -> be at 1
    0 -> apple -> be at 2
    1 -> banana -> be at 3

    sort:
      0 1 2 3
    f(2 3 1 0)
    = 3 2 0 1

});
