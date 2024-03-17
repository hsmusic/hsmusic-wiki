// Clones all the things in a list. If the 'assign' input is provided,
// all new things are assigned the same specified properties. If the
// 'assignEach' input is provided, each new thing is assigned the
// corresponding properties.

import CacheableObject from '#cacheable-object';
import {input, templateCompositeFrom} from '#composite';
import {isObject, sparseArrayOf} from '#validators';

import {withMappedList} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withClonedThings`,

  inputs: {
    things: input({type: 'array'}),

    assign: input({
      type: 'object',
      defaultValue: null,
    }),

    assignEach: input({
      validate: sparseArrayOf(isObject),
      defaultValue: null,
    }),
  },

  outputs: ['#clonedThings'],

  steps: () => [
    {
      dependencies: [input('assign'), input('assignEach')],
      compute: (continuation, {
        [input('assign')]: assign,
        [input('assignEach')]: assignEach,
      }) => continuation({
        ['#assignmentMap']:
          (index) =>
            (assign && assignEach
              ? {...assignEach[index] ?? {}, ...assign}
           : assignEach
              ? assignEach[index] ?? {}
              : assign ?? {}),
      }),
    },

    {
      dependencies: ['#assignmentMap'],
      compute: (continuation, {
        ['#assignmentMap']: assignmentMap,
      }) => continuation({
        ['#cloningMap']:
          (thing, index) =>
            Object.assign(
              CacheableObject.clone(thing),
              assignmentMap(index)),
      }),
    },

    withMappedList({
      list: input('things'),
      map: '#cloningMap',
    }).outputs({
      '#mappedList': '#clonedThings',
    }),
  ],
});
