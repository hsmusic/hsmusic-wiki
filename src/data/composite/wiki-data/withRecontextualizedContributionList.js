// Clones all the contributions in a list, with thing and thingProperty both
// updated to match the current thing. Overwrites the provided dependency.
// Optionally updates artistProperty, and optionally reclasses as another
// kind of contribution. Does nothing if the provided dependency is null.
//
// See also:
//  - withRedatedContributionList
//

import {input, templateCompositeFrom} from '#composite';
import thingConstructors from '#thing';
import {isStringNonEmpty, isThingClass} from '#validators';

import {withClonedThings} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withRecontextualizedContributionList`,

  inputs: {
    list: input.staticDependency({
      type: 'array',
      acceptsNull: true,
    }),

    reclass: input({
      validate: isThingClass,
      defaultValue: null,
    }),

    artistProperty: input({
      validate: isStringNonEmpty,
      defaultValue: null,
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
      dependencies: [
        input.myself(),
        input.thisProperty(),
        input('artistProperty'),
      ],

      compute: (continuation, {
        [input.myself()]: myself,
        [input.thisProperty()]: thisProperty,
        [input('artistProperty')]: artistProperty,
      }) => continuation({
        ['#assignment']:
          Object.assign(
            {thing: myself},
            {thingProperty: thisProperty},

            (artistProperty
              ? {artistProperty}
              : {})),
      }),
    },

    withClonedThings({
      things: input('list'),
      reclass: input('reclass'),
      reclassUnder: input.value(thingConstructors.Contribution),
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
