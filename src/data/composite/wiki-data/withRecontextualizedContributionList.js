// Clones all the contributions in a list, with thing and thingProperty both
// updated to match the current thing. Overwrite the provided dependency.
// Doesn't do anything if the provided dependency is null.

import CacheableObject from '#cacheable-object';
import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withMappedList} from '#composite/data';

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
    raiseOutputWithoutDependency({
      dependency: input('list'),
    }),

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

    {
      dependencies: ['#assignment'],

      compute: (continuation, {
        ['#assignment']: assignment,
      }) => continuation({
        ['#map']:
          contrib =>
            Object.assign(
              CacheableObject.clone(contrib),
              assignment),
      }),
    },

    withMappedList({
      list: input('list'),
      map: '#map',
    }).outputs({
      '#mappedList': '#newContributions',
    }),

    {
      dependencies: [input.staticDependency('list'), '#newContributions'],

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
