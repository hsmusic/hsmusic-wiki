// Gets the track section containing this track from its album's track list.
// If notFoundMode is set to 'exit', this will early exit if the album can't be
// found or if none of its trackSections includes the track for some reason.

import {input, templateCompositeFrom} from '#composite';
import {is} from '#validators';

import withPropertyFromAlbum from './withPropertyFromAlbum.js';

export default templateCompositeFrom({
  annotation: `withContainingTrackSection`,

  inputs: {
    notFoundMode: input({
      validate: is('exit', 'null'),
      defaultValue: 'null',
    }),
  },

  outputs: ['#trackSection'],

  steps: () => [
    withPropertyFromAlbum({
      property: input.value('trackSections'),
      notFoundMode: input('notFoundMode'),
    }),

    {
      dependencies: [
        input.myself(),
        input('notFoundMode'),
        '#album.trackSections',
      ],

      compute(continuation, {
        [input.myself()]: track,
        [input('notFoundMode')]: notFoundMode,
        ['#album.trackSections']: trackSections,
      }) {
        if (!trackSections) {
          return continuation.raiseOutput({
            ['#trackSection']: null,
          });
        }

        const trackSection =
          trackSections.find(({tracks}) => tracks.includes(track));

        if (trackSection) {
          return continuation.raiseOutput({
            ['#trackSection']: trackSection,
          });
        } else if (notFoundMode === 'exit') {
          return continuation.exit(null);
        } else {
          return continuation.raiseOutput({
            ['#trackSection']: null,
          });
        }
      },
    },
  ],
});
