import {input, templateCompositeFrom} from '#composite';

import {withResolvedReference} from '#composite/wiki-data';
import {soupyFind} from '#composite/wiki-properties';

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
    withResolvedReference({
      ref: input('ref'),
      find: soupyFind.input('artist'),
    }).outputs({
      '#resolvedReference': '#artist',
    }),
  ],
});
