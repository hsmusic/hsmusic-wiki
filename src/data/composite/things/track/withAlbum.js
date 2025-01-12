// Gets the track's album. This will early exit if albumData is missing.
// If there's no album whose list of tracks includes this track, the output
// dependency will be null.

import {templateCompositeFrom} from '#composite';

import {withUniqueReferencingThing} from '#composite/wiki-data';
import {soupyReverse} from '#composite/wiki-properties';

export default templateCompositeFrom({
  annotation: `withAlbum`,

  outputs: ['#album'],

  steps: () => [
    withUniqueReferencingThing({
      reverse: soupyReverse.input('albumsWhoseTracksInclude'),
    }).outputs({
      ['#uniqueReferencingThing']: '#album',
    }),
  ],
});
