// Sorts a list of live, generic wiki data objects chronologically.
// Like withThingsSortedAlphabetically, this uses localeCompare but isn't
// specialized to a particular language.

import {input, templateCompositeFrom} from '#composite';
import {compareDates} from '#sort';
import {validateWikiData} from '#validators';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

import {
  withAlignedIndices,
  withAlignedList,
  withIndicesFromList,
  withSortedList,
  withPropertyFromList,
} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withThingsSortedChronologically`,

  inputs: {
    things: input({validate: validateWikiData}),

    dateProperty: input({
      type: 'string',
      defaultValue: 'date',
    }),

    latestFirst: input({
      type: 'boolean',
      defaultValue: false,
    }),
  },

  outputs: ['#sortedThings'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: input('things'),
      mode: input.value('empty'),
      output: input.value({'#sortedThings': []}),
    }),

    withPropertyFromList({
      list: input('things'),
      property: input('dateProperty'),
    }).outputs({
      '#values': '#dates',
    }),

    {
      dependencies: [input('latestFirst')],
      compute: (continuation, {
        [input('latestFirst')]: latestFirst,
      }) => continuation({
        ['#sortFunction']:
          (a, b) => compareDates(a, b, {latestFirst}),
      }),
    },

    withSortedList({
      list: '#dates',
      sort: '#sortFunction',
    }).outputs({
      '#unstableSortIndices': '#dateSortIndices',
    }),

    withIndicesFromList({
      list: input('things'),
    }),

    withAlignedIndices({
      indices: '#indices',
      alignment: '#dateSortIndices',
    }),

    // {
    //   dependencies: ['#dateSortIndices', '#alignedIndices', '#indices'],
    //   compute: (continuation, opts) => {
    //     console.log(opts);
    //     return continuation();
    //   },
    // },

    withAlignedList({
      list: input('things'),
      alignment: '#alignedIndices',
    }).outputs({
      '#alignedList': '#sortedThings',
    }),
  ],
});
