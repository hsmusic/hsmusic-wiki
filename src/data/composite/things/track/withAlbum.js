// Gets the track's album. This will early exit if albumData is missing.
// By default, if there's no album whose list of tracks includes this track,
// the output dependency will be null; set {notFoundMode: 'exit'} to early
// exit instead.

import {input, templateCompositeFrom} from '#composite';
import {is} from '#validators';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

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
    raiseOutputWithoutDependency({
      dependency: 'albumData',
      mode: input.value('empty'),
      output: input.value({
        ['#album']: null,
      }),
    }),

    {
      dependencies: [input.myself(), 'albumData'],
      compute: (continuation, {
        [input.myself()]: track,
        ['albumData']: albumData,
      }) =>
        continuation({
          ['#album']:
            albumData.find(album => album.tracks.includes(track)),
        }),
    },

    raiseOutputWithoutDependency({
      dependency: '#album',
      output: input.value({
        ['#album']: null,
      }),
    }),

    {
      dependencies: ['#album'],
      compute: (continuation, {'#album': album}) =>
        continuation.raiseOutput({'#album': album}),
    },
  ],
});
