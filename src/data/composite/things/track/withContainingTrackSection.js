// Gets the track section containing this track from its album's track list.

import {input, templateCompositeFrom} from '#composite';
import {is} from '#validators';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

import withPropertyFromAlbum from './withPropertyFromAlbum.js';

export default templateCompositeFrom({
  annotation: `withContainingTrackSection`,

  outputs: ['#trackSection'],

  steps: () => [
    withPropertyFromAlbum({
      property: input.value('trackSections'),
    }),

    raiseOutputWithoutDependency({
      dependency: '#album.trackSections',
      output: input.value({'#trackSection': null}),
    }),

    {
      dependencies: [
        input.myself(),
        '#album.trackSections',
      ],

      compute: (continuation, {
        [input.myself()]: track,
        [input('notFoundMode')]: notFoundMode,
        ['#album.trackSections']: trackSections,
      }) => continuation({
        ['#trackSection']:
          trackSections.find(({tracks}) => tracks.includes(track))
            ?? null,
      }),
    },
  ],
});
