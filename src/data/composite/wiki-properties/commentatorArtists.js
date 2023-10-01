// This one's kinda tricky: it parses artist "references" from the
// commentary content, and finds the matching artist for each reference.
// This is mostly useful for credits and listings on artist pages.

import {input, templateCompositeFrom} from '#composite';
import find from '#find';
import {unique} from '#sugar';

import {exitWithoutDependency} from '#composite/control-flow';
import {withResolvedReferenceList} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `commentatorArtists`,

  compose: false,

  steps: () => [
    exitWithoutDependency({
      dependency: 'commentary',
      mode: input.value('falsy'),
      value: input.value([]),
    }),

    {
      dependencies: ['commentary'],
      compute: (continuation, {commentary}) =>
        continuation({
          '#artistRefs':
            Array.from(
              commentary
                .replace(/<\/?b>/g, '')
                .matchAll(/<i>(?<who>.*?):<\/i>/g))
              .map(({groups: {who}}) => who),
        }),
    },

    withResolvedReferenceList({
      list: '#artistRefs',
      data: 'artistData',
      find: input.value(find.artist),
    }).outputs({
      '#resolvedReferenceList': '#artists',
    }),

    {
      flags: {expose: true},

      expose: {
        dependencies: ['#artists'],
        compute: ({'#artists': artists}) =>
          unique(artists),
      },
    },
  ],
});
