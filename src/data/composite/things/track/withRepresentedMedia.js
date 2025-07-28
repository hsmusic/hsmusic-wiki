import {input, templateCompositeFrom} from '#composite';

import {withResolvedAnnotatedReferenceList} from '#composite/wiki-data';
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

    withResolvedAnnotatedReferenceList({
      list: input('from'),
      find: soupyFind.input('medium'),

      thing: input.value('medium'),
    }),

    {
      dependencies: [
        '#inheritedMedia',
        '#resolvedAnnotatedReferenceList',
      ],

      compute: (continuation, {
        ['#inheritedMedia']: inheritedMedia,
        ['#resolvedAnnotatedReferenceList']: resolvedAnnotatedReferenceList,
      }) => continuation({
        ['#representedMedia']:
          [
            ...inheritedMedia,
            ...resolvedAnnotatedReferenceList,
          ],
      }),
    },
  ],
})
