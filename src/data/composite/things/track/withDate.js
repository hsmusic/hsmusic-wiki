// Gets the track's own date. This is either its dateFirstReleased property
// or, if unset, the album's date.

import {input, templateCompositeFrom} from '#composite';

import withPropertyFromAlbum from './withPropertyFromAlbum.js';

export default templateCompositeFrom({
  annotation: `withDate`,

  outputs: ['#date'],

  steps: () => [
    {
      dependencies: ['dateFirstReleased'],
      compute: (continuation, {dateFirstReleased}) =>
        (dateFirstReleased
          ? continuation.raiseOutput({'#date': dateFirstReleased})
          : continuation()),
    },

    withPropertyFromAlbum({
      property: input.value('date'),
    }),

    {
      dependencies: ['#album.date'],
      compute: (continuation, {['#album.date']: albumDate}) =>
        (albumDate
          ? continuation.raiseOutput({'#date': albumDate})
          : continuation.raiseOutput({'#date': null})),
    },
  ],
})
