// Gets the total duration and contribution count from a list of contributions,
// respecting their `countInContributionTotals` and `countInDurationTotals`
// flags.

import {input, templateCompositeFrom} from '#composite';

import {
  withFilteredList,
  withPropertiesFromList,
  withPropertyFromList,
  withSum,
  withUniqueItemsOnly,
} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withContributionListSums`,

  inputs: {
    list: input({type: 'array'}),
  },

  outputs: [
    '#contributionListCount',
    '#contributionListDuration',
  ],

  steps: () => [
    withPropertiesFromList({
      list: input('list'),
      properties: input.value([
        'countInContributionTotals',
        'countInDurationTotals',
      ]),
    }),

    withFilteredList({
      list: input('list'),
      filter: '#list.countInContributionTotals',
    }).outputs({
      '#filteredList': '#contributionsForCounting',
    }),

    withFilteredList({
      list: input('list'),
      filter: '#list.countInDurationTotals',
    }).outputs({
      '#filteredList': '#contributionsForDuration',
    }),

    {
      dependencies: ['#contributionsForCounting'],
      compute: (continuation, {
        ['#contributionsForCounting']: contributionsForCounting,
      }) => continuation({
        ['#count']:
          contributionsForCounting.length,
      }),
    },

    withPropertyFromList({
      list: '#contributionsForDuration',
      property: input.value('thing'),
    }),

    // Don't double-up the durations for a track where the artist has multiple
    // contributions.
    withUniqueItemsOnly({
      list: '#contributionsForDuration.thing',
    }),

    withPropertyFromList({
      list: '#contributionsForDuration.thing',
      property: input.value('duration'),
    }).outputs({
      '#contributionsForDuration.thing.duration': '#durationValues',
    }),

    withSum({
      values: '#durationValues',
    }).outputs({
      '#sum': '#duration',
    }),

    {
      dependencies: ['#count', '#duration'],
      compute: (continuation, {
        ['#count']: count,
        ['#duration']: duration,
      }) => continuation({
        ['#contributionListCount']: count,
        ['#contributionListDuration']: duration,
      }),
    },
  ],
});
