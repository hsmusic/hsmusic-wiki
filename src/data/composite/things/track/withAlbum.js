// Gets the track's album. This will early exit if albumData is missing.
// By default, if there's no album whose list of tracks includes this track,
// the output dependency will be null; set {notFoundMode: 'exit'} to early
// exit instead.

import {input, templateCompositeFrom} from '#composite';
import {is} from '#validators';

import {exitWithoutDependency, withResultOfAvailabilityCheck}
  from '#composite/control-flow';
import {withPropertyFromList} from '#composite/data';

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
    // null albumData is always an early exit.

    exitWithoutDependency({
      dependency: 'albumData',
      mode: input.value('null'),
    }),

    // empty albumData conditionally exits early or outputs null.

    withResultOfAvailabilityCheck({
      from: 'albumData',
      mode: input.value('empty'),
    }).outputs({
      '#availability': '#albumDataAvailability',
    }),

    {
      dependencies: [input('notFoundMode'), '#albumDataAvailability'],
      compute(continuation, {
        [input('notFoundMode')]: notFoundMode,
        ['#albumDataAvailability']: albumDataIsAvailable,
      }) {
        if (albumDataIsAvailable) return continuation();
        switch (notFoundMode) {
          case 'exit': return continuation.exit(null);
          case 'null': return continuation.raiseOutput({'#album': null});
        }
      },
    },

    withPropertyFromList({
      list: 'albumData',
      property: input.value('tracks'),
    }),

    {
      dependencies: [input.myself(), '#albumData.tracks'],
      compute: (continuation, {
        [input.myself()]: track,
        ['#albumData.tracks']: trackLists,
      }) => continuation({
        ['#albumIndex']:
          trackLists.findIndex(tracks => tracks.includes(track)),
      }),
    },

    // album not found conditionally exits or outputs null.

    withResultOfAvailabilityCheck({
      from: '#albumIndex',
      mode: input.value('index'),
    }).outputs({
      '#availability': '#albumAvailability',
    }),

    {
      dependencies: [input('notFoundMode'), '#albumAvailability'],
      compute(continuation, {
        [input('notFoundMode')]: notFoundMode,
        ['#albumAvailability']: albumIsAvailable,
      }) {
        if (albumIsAvailable) return continuation();
        switch (notFoundMode) {
          case 'exit': return continuation.exit(null);
          case 'null': return continuation.raiseOutput({'#album': null});
        }
      },
    },

    {
      dependencies: ['albumData', '#albumIndex'],
      compute: (continuation, {
        ['albumData']: albumData,
        ['#albumIndex']: albumIndex,
      }) => continuation.raiseOutput({
        ['#album']:
          albumData[albumIndex],
      }),
    },
  ],
});
