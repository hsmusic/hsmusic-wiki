// Gets the flash's act. This will early exit if flashActData is missing.
// By default, if there's no flash whose list of flashes includes this flash,
// the output dependency will be null; set {notFoundMode: 'exit'} to early
// exit instead.
//
// This step models with Flash.withAlbum.

import {input, templateCompositeFrom} from '#composite';
import {is} from '#validators';

import {exitWithoutDependency, withResultOfAvailabilityCheck}
  from '#composite/control-flow';
import {withPropertyFromList} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withFlashAct`,

  inputs: {
    notFoundMode: input({
      validate: is('exit', 'null'),
      defaultValue: 'null',
    }),
  },

  outputs: ['#flashAct'],

  steps: () => [
    // null flashActData is always an early exit.

    exitWithoutDependency({
      dependency: 'flashActData',
      mode: input.value('null'),
    }),

    // empty flashActData conditionally exits early or outputs null.

    withResultOfAvailabilityCheck({
      from: 'flashActData',
      mode: input.value('empty'),
    }).outputs({
      '#availability': '#flashActDataAvailability',
    }),

    {
      dependencies: [input('notFoundMode'), '#flashActDataAvailability'],
      compute(continuation, {
        [input('notFoundMode')]: notFoundMode,
        ['#flashActDataAvailability']: flashActDataIsAvailable,
      }) {
        if (flashActDataIsAvailable) return continuation();
        switch (notFoundMode) {
          case 'exit': return continuation.exit(null);
          case 'null': return continuation.raiseOutput({'#flashAct': null});
        }
      },
    },

    withPropertyFromList({
      list: 'flashActData',
      property: input.value('flashes'),
    }),

    {
      dependencies: [input.myself(), '#flashActData.flashes'],
      compute: (continuation, {
        [input.myself()]: track,
        ['#flashActData.flashes']: flashLists,
      }) => continuation({
        ['#flashActIndex']:
          flashLists.findIndex(flashes => flashes.includes(track)),
      }),
    },

    // album not found conditionally exits or outputs null.

    withResultOfAvailabilityCheck({
      from: '#flashActIndex',
      mode: input.value('index'),
    }).outputs({
      '#availability': '#flashActAvailability',
    }),

    {
      dependencies: [input('notFoundMode'), '#flashActAvailability'],
      compute(continuation, {
        [input('notFoundMode')]: notFoundMode,
        ['#flashActAvailability']: flashActIsAvailable,
      }) {
        if (flashActIsAvailable) return continuation();
        switch (notFoundMode) {
          case 'exit': return continuation.exit(null);
          case 'null': return continuation.raiseOutput({'#flashAct': null});
        }
      },
    },

    {
      dependencies: ['flashActData', '#flashActIndex'],
      compute: (continuation, {
        ['flashActData']: flashActData,
        ['#flashActIndex']: flashActIndex,
      }) => continuation.raiseOutput({
        ['#flashAct']:
          flashActData[flashActIndex],
      }),
    },
  ],
});
