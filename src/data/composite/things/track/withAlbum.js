// Gets the track's album. This will early exit if albumData is missing.
// If there's no album whose list of tracks includes this track, the output
// dependency will be null.
//
// This step models with Flash.withFlashAct.

import {input, templateCompositeFrom} from '#composite';
import {is} from '#validators';

import {exitWithoutDependency, raiseOutputWithoutDependency}
  from '#composite/control-flow';
import {withPropertyFromList} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withAlbum`,

  outputs: ['#album'],

  steps: () => [
    exitWithoutDependency({
      dependency: 'albumData',
      mode: input.value('null'),
    }),

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

    raiseOutputWithoutDependency({
      dependency: '#albumIndex',
      mode: input.value('index'),
      output: input.value({'#album': null}),
    }),

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
