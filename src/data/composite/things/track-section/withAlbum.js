// Gets the track section's album.

import {templateCompositeFrom} from '#composite';

import {withUniqueReferencingThing} from '#composite/wiki-data';
import {soupyReverse} from '#composite/wiki-properties';

export default templateCompositeFrom({
  annotation: `withAlbum`,

  outputs: ['#album'],

  steps: () => [
    withUniqueReferencingThing({
      reverse: soupyReverse.input('albumsWhoseTrackSectionsInclude'),
    }).outputs({
      ['#uniqueReferencingThing']: '#album',
    }),
  ],
});
