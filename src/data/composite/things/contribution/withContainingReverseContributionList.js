// Get the artist's contribution list containing this property. Although that
// list literally includes both dated and un-dated contributions, here the list
// is filtered including only the matching subset (has dates vs dateless).

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
      }) => continuation({
        ['#containingReverseContributionList']:
          list.filter(contribution => !!contribution.date === hasDate),
      }),
    },
  ],
});
