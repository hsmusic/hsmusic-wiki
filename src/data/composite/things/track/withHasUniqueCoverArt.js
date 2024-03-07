// Whether or not the track has "unique" cover artwork - a cover which is
// specifically associated with this track in particular, rather than with
// the track's album as a whole. This is typically used to select between
// displaying the track artwork and a fallback, such as the album artwork
// or a placeholder. (This property is named hasUniqueCoverArt instead of
// the usual hasCoverArt to emphasize that it does not inherit from the
// album.)

import {input, templateCompositeFrom} from '#composite';
import {empty} from '#sugar';

import {withResolvedContribs} from '#composite/wiki-data';

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

    withResolvedContribs({
      from: 'coverArtistContribs',
      date: input.value(null),
    }),

    {
      dependencies: ['#resolvedContribs'],
      compute: (continuation, {
        ['#resolvedContribs']: contribsFromTrack,
      }) =>
        (empty(contribsFromTrack)
          ? continuation()
          : continuation.raiseOutput({
              ['#hasUniqueCoverArt']: true,
            })),
    },

    withPropertyFromAlbum({
      property: input.value('trackCoverArtistContribs'),
    }),

    {
      dependencies: ['#album.trackCoverArtistContribs'],
      compute: (continuation, {
        ['#album.trackCoverArtistContribs']: contribsFromAlbum,
      }) =>
        continuation.raiseOutput({
          ['#hasUniqueCoverArt']:
            !empty(contribsFromAlbum),
        }),
    },
  ],
});
