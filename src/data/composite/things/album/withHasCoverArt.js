// TODO: This shouldn't be coded as an Album-specific thing,
// or even really to do with cover artworks in particular, either.

import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency, withResultOfAvailabilityCheck}
  from '#composite/control-flow';
import {fillMissingListItems, withFlattenedList, withPropertyFromList}
  from '#composite/data';

export default templateCompositeFrom({
  annotation: 'withHasCoverArt',

  outputs: ['#hasCoverArt'],

  steps: () => [
    withResultOfAvailabilityCheck({
      from: 'coverArtistContribs',
      mode: input.value('empty'),
    }),

    {
      dependencies: ['#availability'],
      compute: (continuation, {
        ['#availability']: availability,
      }) =>
        (availability
          ? continuation.raiseOutput({
              ['#hasCoverArt']: true,
            })
          : continuation()),
    },

    raiseOutputWithoutDependency({
      dependency: 'coverArtworks',
      mode: input.value('empty'),
      output: input.value({'#hasCoverArt': false}),
    }),

    withPropertyFromList({
      list: 'coverArtworks',
      property: input.value('artistContribs'),
      internal: input.value(true),
    }),

    // Since we're getting the update value for each artwork's artistContribs,
    // it may not be set at all, and in that case won't be exposing as [].
    fillMissingListItems({
      list: '#coverArtworks.artistContribs',
      fill: input.value([]),
    }),

    withFlattenedList({
      list: '#coverArtworks.artistContribs',
    }),

    withResultOfAvailabilityCheck({
      from: '#flattenedList',
      mode: input.value('empty'),
    }).outputs({
      '#availability': '#hasCoverArt',
    }),
  ],
});
