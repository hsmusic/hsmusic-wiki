import {input, templateCompositeFrom} from '#composite';
import find from '#find';

import {withPropertyFromObject} from '#composite/data';
import {withResolvedReference} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withContributionArtist`,

  inputs: {
    ref: input({
      type: 'string',
      defaultDependency: 'artist',
    }),
  },

  outputs: ['#artist'],

  steps: () => [
    withPropertyFromObject({
      object: 'thing',
      property: input.value('artistData'),
      internal: input.value(true),
    }),

    withResolvedReference({
      ref: input('ref'),
      data: '#thing.artistData',
      find: input.value(find.artist),
    }).outputs({
      '#resolvedReference': '#artist',
    }),
  ],
});
