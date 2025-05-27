import {input, templateCompositeFrom} from '#composite';
import find from '#find';

import annotatedReferenceList from './annotatedReferenceList.js';

export default templateCompositeFrom({
  annotation: `referencedArtworkList`,

  compose: false,

  steps: () => [
    {
      compute: (continuation) => continuation({
        ['#find']:
          find.mixed({
            track: find.trackPrimaryArtwork,
            album: find.albumPrimaryArtwork,
          }),
      }),
    },

    annotatedReferenceList({
      referenceType: input.value(['album', 'track']),

      data: 'artworkData',
      find: '#find',

      thing: input.value('artwork'),
    }),
  ],
});
