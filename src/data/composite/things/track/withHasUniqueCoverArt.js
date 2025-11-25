// Whether or not the track has "unique" cover artwork - a cover which is
// specifically associated with this track in particular, rather than with
// the track's album as a whole. This is typically used to select between
// displaying the track artwork and a fallback, such as the album artwork
// or a placeholder. (This property is named hasUniqueCoverArt instead of
// the usual hasCoverArt to emphasize that it does not inherit from the
// album.)
//
// withHasUniqueCoverArt is based only around the presence of *specified*
// cover artist contributions, not whether the references to artists on those
// contributions actually resolve to anything. It completely evades interacting
// with find/replace.

import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency, withResultOfAvailabilityCheck}
  from '#composite/control-flow';
import {fillMissingListItems, withFlattenedList, withPropertyFromList}
  from '#composite/data';

import withPropertyFromAlbum from './withPropertyFromAlbum.js';

export default templateCompositeFrom({
  annotation: 'withHasUniqueCoverArt',

  outputs: ['#hasUniqueCoverArt'],

  steps: () => [
    {
      dependencies: ['disableUniqueCoverArt'],
      compute: (continuation, {disableUniqueCoverArt}) =>
        (disableUniqueCoverArt
          ? continuation.raiseOutput({
              ['#hasUniqueCoverArt']: false,
            })
          : continuation()),
    },

    withResultOfAvailabilityCheck({
      from: '_coverArtistContribs',
      mode: input.value('empty'),
    }),

    {
      dependencies: ['#availability'],
      compute: (continuation, {
        ['#availability']: availability,
      }) =>
        (availability
          ? continuation.raiseOutput({
              ['#hasUniqueCoverArt']: true,
            })
          : continuation()),
    },

    withPropertyFromAlbum({
      property: input.value('trackCoverArtistContribs'),
      internal: input.value(true),
    }),

    withResultOfAvailabilityCheck({
      from: '#album.trackCoverArtistContribs',
      mode: input.value('empty'),
    }),

    {
      dependencies: ['#availability'],
      compute: (continuation, {
        ['#availability']: availability,
      }) =>
        (availability
          ? continuation.raiseOutput({
              ['#hasUniqueCoverArt']: true,
            })
          : continuation()),
    },

    raiseOutputWithoutDependency({
      dependency: '_trackArtworks',
      mode: input.value('empty'),
      output: input.value({'#hasUniqueCoverArt': false}),
    }),

    withPropertyFromList({
      list: '_trackArtworks',
      property: input.value('artistContribs'),
      internal: input.value(true),
    }),

    // Since we're getting the update value for each artwork's artistContribs,
    // it may not be set at all, and in that case won't be exposing as [].
    fillMissingListItems({
      list: '#trackArtworks.artistContribs',
      fill: input.value([]),
    }),

    withFlattenedList({
      list: '#trackArtworks.artistContribs',
    }),

    withResultOfAvailabilityCheck({
      from: '#flattenedList',
      mode: input.value('empty'),
    }).outputs({
      '#availability': '#hasUniqueCoverArt',
    }),
  ],
});
