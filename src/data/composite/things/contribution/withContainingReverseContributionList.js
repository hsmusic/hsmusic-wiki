// Get the artist's contribution list containing this property. Although that
// list literally includes both dated and dateless contributions, here, if the
// current contribution is dateless, the list is filtered to only include
// dateless contributions from the same immediately nearby context.

import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency, withResultOfAvailabilityCheck}
  from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';

import withContributionArtist from './withContributionArtist.js';

export default templateCompositeFrom({
  annotation: `withContainingReverseContributionList`,

  inputs: {
    artistProperty: input({
      defaultDependency: 'artistProperty',
      acceptsNull: true,
    }),
  },

  outputs: ['#containingReverseContributionList'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: input('artistProperty'),
      output: input.value({
        ['#containingReverseContributionList']:
          null,
      }),
    }),

    withContributionArtist(),

    withPropertyFromObject({
      object: '#artist',
      property: input('artistProperty'),
    }).outputs({
      ['#value']: '#list',
    }),

    withResultOfAvailabilityCheck({
      from: 'date',
    }).outputs({
      ['#availability']: '#hasDate',
    }),

    {
      dependencies: ['#hasDate', '#list'],
      compute: (continuation, {
        ['#hasDate']: hasDate,
        ['#list']: list,
      }) =>
        (hasDate
          ? continuation.raiseOutput({
              ['#containingReverseContributionList']:
                list.filter(contrib => contrib.date),
            })
          : continuation({
              ['#list']:
                list.filter(contrib => !contrib.date),
            })),
    },

    {
      dependencies: ['#list', 'thing'],
      compute: (continuation, {
        ['#list']: list,
        ['thing']: thing,
      }) => continuation({
        ['#containingReverseContributionList']:
          (thing.album
            ? list.filter(contrib => contrib.thing.album === thing.album)
            : list),
      }),
    },
  ],
});
