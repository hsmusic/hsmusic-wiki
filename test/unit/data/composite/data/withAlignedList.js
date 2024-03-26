import t from 'tap';

import {compositeFrom, input} from '#composite';
import {exposeDependency} from '#composite/control-flow';
import {withAlignedList} from '#composite/data';

const composite = compositeFrom({
  compose: false,

  steps: [
    withAlignedList({
      list: 'list',
      alignment: 'alignment',
    }),

    exposeDependency({dependency: '#alignedList'}),
  ],
});

t.test(`withAlignedList: basic behavior`, t => {
  t.plan(4);

  t.match(composite, {
    expose: {
      dependencies: ['list', 'alignment'],
    },
  });

  t.same(
    composite.expose.compute({
      list:      ['foo', 'bar', 'baz'],
      alignment: [7, 4, 5],
    }),
    ['bar', 'baz', 'foo']);

  t.same(
    composite.expose.compute({
      list:      ['apple', 'banana', 'watermelon'],
      alignment: [1000, 2000, 3000],
    }),
    ['apple', 'banana', 'watermelon']);

  t.same(
    composite.expose.compute({
      list:      [2, 1, 0],
      alignment: [2, 1, 0],
    }),
    [0, 1, 2]);
});

t.test(`withAlignedList: duplicate items in alignment`, t => {
  t.plan(2);

  t.same(
    composite.expose.compute({
      list:      ['snoo', 'ping', 'as', 'usual'],
      alignment: [4, 2, 2, 3],
    }),
    ['ping', 'as', 'usual', 'snoo']);

  t.same(
    composite.expose.compute({
      list:      ['snoo', 'as', 'ping', 'usual'],
      alignment: [4, 2, 2, 3],
    }),
    ['as', 'ping', 'usual', 'snoo']);
});

t.test(`withAlignedList: duplicate items in list & alignment`, t => {
  t.plan(1);

  t.same(
    composite.expose.compute({
      list:      [0, 4, 0, 0, 0, 4],
      alignment: [2, 1, 2, 0, 2, 1],
    }),
    [0, 4, 4, 0, 0, 0]);
});
