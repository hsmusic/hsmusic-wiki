// Clones all the contributions in a list, with date updated to the provided
// value. Overwrites the provided dependency. Doesn't do anything if the
// provided dependency is null, or the provided date is null.
//
// If 'override' is true (the default), then so long as the provided date has
// a value at all, it's always written onto the (cloned) contributions.
//
// If 'override' is false, and any of the contributions were already dated,
// those will keep their existing dates.
//
// See also:
//  - withRecontextualizedContributionList
//

import {input, templateCompositeFrom} from '#composite';
import {isDate} from '#validators';

import {withMappedList, withPropertyFromList} from '#composite/data';
import {withClonedThings} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withRedatedContributionList`,

  inputs: {
    list: input.staticDependency({
      type: 'array',
      acceptsNull: true,
    }),

    date: input({
      validate: isDate,
      acceptsNull: true,
    }),

    override: input({
      type: 'boolean',
      defaultValue: true,
    }),
  },

  outputs: ({
    [input.staticDependency('list')]: list,
  }) => [list],

  steps: () => [
    // TODO: Is raiseOutputWithoutDependency workable here?
    // Is it true that not specifying any output wouldn't overwrite
    // the provided dependency?
    {
      dependencies: [
        input.staticDependency('list'),
        input('list'),
        input('date'),
      ],

      compute: (continuation, {
        [input.staticDependency('list')]: dependency,
        [input('list')]: list,
        [input('date')]: date,
      }) =>
        (list && date
          ? continuation()
          : continuation.raiseOutput({
              [dependency]: list,
            })),
    },

    withPropertyFromList({
      list: input('list'),
      property: input.value('date'),
    }).outputs({
      '#list.date': '#existingDates',
    }),

    {
      dependencies: [
        input('date'),
        input('override'),
        '#existingDates',
      ],

      compute: (continuation, {
        [input('date')]: date,
        [input('override')]: override,
        '#existingDates': existingDates,
      }) => continuation({
        ['#assignmentMap']:
          // TODO: Should be mapping over withIndicesFromList
          (_, index) =>
            (!override && existingDates[index]
              ? {date: existingDates[index]}
           : date
              ? {date}
              : {}),
      }),
    },

    withMappedList({
      list: input('list'),
      map: '#assignmentMap',
    }).outputs({
      '#mappedList': '#assignment',
    }),

    withClonedThings({
      things: input('list'),
      assignEach: '#assignment',
    }).outputs({
      '#clonedThings': '#newContributions',
    }),

    {
      dependencies: [
        input.staticDependency('list'),
        '#newContributions',
      ],

      compute: (continuation, {
        [input.staticDependency('list')]: listDependency,
        ['#newContributions']: newContributions,
      }) => continuation({
        [listDependency]:
          newContributions,
      }),
    },
  ],
});
