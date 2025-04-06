import {input, templateCompositeFrom} from '#composite';
import find from '#find';
import {isDate} from '#validators';

import annotatedReferenceList from './annotatedReferenceList.js';

export default templateCompositeFrom({
  annotation: `referencedArtworkList`,

  compose: false,

  inputs: {
    date: input({
      validate: isDate,
      acceptsNull: true,
    }),
  },

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
      date: input('date'),
    }),
  ],
});
