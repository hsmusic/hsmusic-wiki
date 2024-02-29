// Sorts a list of generic values to "align" with a list of numeric values.
// For example, [foo, bar, baz] aligned with [7, 4, 5] will be aligned as
// [bar, baz, foo]. If two or more items of the list correspond to the same
// numeric value, they'll be left in the same positions relative to each other.
// This means [A, B, C, D] aligned with [2, 1, 1, 3] results in [B, C, A, D].
//
// This function essentially mirrors the #unstableSortIndices output of
// withSortedList; applying multiple instances of withAlignedList mapped from

import {input, templateCompositeFrom} from '#composite';
import {isArray, isNumber, strictArrayOf} from '#validators';

import withAlignedIndices from './withAlignedIndices.js';
import withIndicesFromList from './withIndicesFromList.js';

export default templateCompositeFrom({
  annotation: `withAlignedList`,

  inputs: {
    list: input({
      validate: isArray,
    }),

    alignment: input({
      validate: strictArrayOf(isNumber),
    }),
  },

  outputs: ['#alignedList'],

  steps: () => [
    withIndicesFromList({
      list: input('list'),
    }),

    /*
    {
      dependencies: ['#indices', input('alignment')],
      compute: (continuation, {
        ['#indices']: indices,
        [input('alignment')]: alignment,
      }) => continuation({
        ['#alignedIndices']:
          indices.sort((index1, index2) =>
            alignment[index1] - alignment[index2]),
      }),
    },
    */

    withAlignedIndices({
      indices: '#indices',
      alignment: input('alignment'),
    }),

    {
      dependencies: ['#alignedIndices', input('list')],
      compute: (continuation, {
        ['#alignedIndices']: alignedIndices,
        [input('list')]: list,
      }) => continuation({
        ['#alignedList']:
          alignedIndices.map(index => list[index]),
      }),
    },

    // {
    //   dependencies: [input('list'), '#alignedIndices', '#alignedList'],
    //   compute: (continuation, opts) => {
    //     console.log(opts);
    //     return continuation({
    //       '#alignedList': opts['#alignedList'],
    //     });
    //   },
    // },
  ],
});
