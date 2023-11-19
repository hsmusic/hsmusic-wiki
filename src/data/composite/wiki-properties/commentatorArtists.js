// List of artists referenced in commentary entries.
// This is mostly useful for credits and listings on artist pages.

import {input, templateCompositeFrom} from '#composite';
import {unique} from '#sugar';

import {exitWithoutDependency, exposeDependency}
  from '#composite/control-flow';
import {withFlattenedList, withPropertyFromList, withUniqueItemsOnly}
  from '#composite/data';
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
      property: input.value('artists'),
    }).outputs({
      '#parsedCommentaryEntries.artists': '#artistLists',
    }),

    withFlattenedList({
      list: '#artistLists',
    }).outputs({
      '#flattenedList': '#artists',
    }),

    withUniqueItemsOnly({
      list: '#artists',
    }),

    exposeDependency({
      dependency: '#artists',
    }),
  ],
});
