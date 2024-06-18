// Get the artist's contribution list containing this property.

import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
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
      ['#value']: '#containingReverseContributionList',
    }),
  ],
});
