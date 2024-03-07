// Clones all the contributions in a list, with thing and thingProperty both
// updated to match the current thing. Overwrite the provided dependency.
// Doesn't do anything if the provided dependency is null.

import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withClonedThings} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withRecontextualizedContributionList`,

  inputs: {
    list: input.staticDependency({
      type: 'array',
      acceptsNull: true,
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
      ],

      compute: (continuation, {
        [input.staticDependency('list')]: dependency,
        [input('list')]: list,
      }) =>
        (list
          ? continuation()
          : continuation.raiseOutput({
              [dependency]: list,
            })),
    },

    {
      dependencies: [input.myself(), input.thisProperty()],

      compute: (continuation, {
        [input.myself()]: myself,
        [input.thisProperty()]: thisProperty,
      }) => continuation({
        ['#assignment']: {
          thing: myself,
          thingProperty: thisProperty,
        },
      }),
    },

    withClonedThings({
      things: input('list'),
      assign: '#assignment',
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
