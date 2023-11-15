// List of artists referenced in commentary entries.
// This is mostly useful for credits and listings on artist pages.

import {input, templateCompositeFrom} from '#composite';
import {unique} from '#sugar';

import {exitWithoutDependency} from '#composite/control-flow';
import {withPropertyFromList} from '#composite/data';
import {withParsedCommentaryEntries} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `commentatorArtists`,

  compose: false,

  steps: () => [
    exitWithoutDependency({
      dependency: 'commentary',
      mode: input.value('falsy'),
      value: input.value([]),
    }),

    withParsedCommentaryEntries({
      from: 'commentary',
    }),

    withPropertyFromList({
      list: '#parsedCommentaryEntries',
      property: input.value('artist'),
    }).outputs({
      '#parsedCommentaryEntries.artist': '#artists',
    }),

    {
      dependencies: ['#artists'],
      compute: ({'#artists': artists}) =>
        unique(artists.filter(artist => artist !== null)),
    },
  ],
});
