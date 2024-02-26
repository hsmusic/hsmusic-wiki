// Sorts a list of live, generic wiki data objects alphabetically.
// Like withThingsSortedAlphabetically, this uses localeCompare but isn't
// specialized to a particular language.

import {input, templateCompositeFrom} from '#composite';
import {compareDates} from '#sort';
import {validateWikiData} from '#validators';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withSortedList, withPropertyFromList} from '#composite/data';

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

    // TODO: No primitive for the next two-three steps, yet...

    {
      dependencies: [input('things')],
      compute: (continuation, {
        [input('things')]: things,
      }) => continuation({
        ['#combinedSortIndices']:
          Array.from(things.keys()),
      }),
    },

    {
      dependencies: [
        '#combinedSortIndices',
        '#dateSortIndices',
      ],

      compute: (continuation, {
        ['#combinedSortIndices']: combined,
        ['#dateSortIndices']: date,
      }) => continuation({
        ['#combinedSortIndices']:
          combined.sort((index1, index2) => {
            if (date[index1] !== date[index2])
              return date[index1] - date[index2];

            return 0;
          }),
      }),
    },

    {
      dependencies: [input('things'), '#combinedSortIndices'],
      compute: (continuation, {
        [input('things')]: things,
        ['#combinedSortIndices']: combined,
      }) => continuation({
        ['#sortedThings']:
          combined.map(index => things[index]),
      }),
    },
  ],
});
