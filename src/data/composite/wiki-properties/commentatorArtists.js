// List of artists referenced in commentary entries.
// This is mostly useful for credits and listings on artist pages.

import {input, templateCompositeFrom} from '#composite';

import {exitWithoutDependency, exposeDependency}
  from '#composite/control-flow';
import {withFlattenedList, withPropertyFromList, withUniqueItemsOnly}
  from '#composite/data';

export default templateCompositeFrom({
  annotation: `commentatorArtists`,

  compose: false,

  steps: () => [
    exitWithoutDependency('commentary', {
      value: input.value([]),
      mode: input.value('falsy'),
    }),

    withPropertyFromList({
      list: 'commentary',
      property: input.value('artists'),
    }),

    withFlattenedList({
      list: '#commentary.artists',
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
