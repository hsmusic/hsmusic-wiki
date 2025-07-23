import {input, templateCompositeFrom} from '#composite';

import {withResolvedReferenceList} from '#composite/wiki-data';
import {soupyFind} from '#composite/wiki-properties';

import withInheritedMedia from './withInheritedMedia.js';

export default templateCompositeFrom({
  annotation: `withRepresentedMedia`,

  inputs: {
    from: input({
      type: 'array',
      acceptsNull: true,
      defaultDependency: 'representedMedia',
    }),
  },

  outputs: ['#representedMedia'],

  steps: () => [
    withInheritedMedia(),

    withResolvedReferenceList({
      list: input('from'),
      find: soupyFind.input('medium'),
    }),

    {
      dependencies: [
        '#inheritedMedia',
        '#resolvedReferenceList',
      ],

      compute: (continuation, {
        ['#inheritedMedia']: inheritedMedia,
        ['#resolvedReferenceList']: resolvedReferenceList,
      }) => continuation({
        ['#representedMedia']:
          [
            ...inheritedMedia,
            ...resolvedReferenceList,
          ],
      }),
    },
  ],
})
