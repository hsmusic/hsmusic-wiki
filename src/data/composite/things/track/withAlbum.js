// Gets the track's album. This will early exit if albumData is missing.
// By default, if there's no album whose list of tracks includes this track,
// the output dependency will be null; set {notFoundMode: 'exit'} to early
// exit instead.

import {input, templateCompositeFrom} from '#composite';
import {empty} from '#sugar';
import {is} from '#validators';

export default templateCompositeFrom({
  annotation: `withAlbum`,

  inputs: {
    notFoundMode: input({
      validate: is('exit', 'null'),
      defaultValue: 'null',
    }),
  },

  outputs: ['#album'],

  steps: () => [
    {
      dependencies: [input('notFoundMode'), 'albumData'],
      compute: (continuation, {
        [input('notFoundMode')]: notFoundMode,
        ['albumData']: albumData,
      }) =>
        (albumData === null
          ? continuation.exit(null)
       : empty(albumData)
          ? (notFoundMode === 'exit'
              ? continuation.exit(null)
              : continuation.raiseOutput({'#album': null}))
          : continuation()),
    },

    {
      dependencies: [input.myself(), 'albumData'],
      compute: (continuation, {
        [input.myself()]: track,
        ['albumData']: albumData,
      }) =>
        continuation({
          ['#album']:
            albumData.find(album => album.tracks.includes(track))
              ?? null,
        }),
    },

    {
      dependencies: [input('notFoundMode'), '#album'],
      compute: (continuation, {
        [input('notFoundMode')]: notFoundMode,
        ['#album']: album,
      }) =>
        ((album === null && notFoundMode === 'exit')
          ? continuation.exit(null)
          : continuation.raiseOutput({'#album': album})),
    },
  ],
});
