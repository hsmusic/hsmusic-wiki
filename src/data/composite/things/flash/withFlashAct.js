// Gets the flash's act. This will early exit if flashActData is missing.
// If there's no flash whose list of flashes includes this flash, the output
// dependency will be null.
//
// This step models with Flash.withAlbum.

import {input, templateCompositeFrom} from '#composite';
import {is} from '#validators';

import {exitWithoutDependency, raiseOutputWithoutDependency}
  from '#composite/control-flow';
import {withPropertyFromList} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withFlashAct`,

  outputs: ['#flashAct'],

  steps: () => [
    exitWithoutDependency({
      dependency: 'flashActData',
      mode: input.value('null'),
    }),

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

    raiseOutputWithoutDependency({
      dependency: '#flashActIndex',
      mode: input.value('index'),
      output: input.value({'#album': null}),
    }),

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
