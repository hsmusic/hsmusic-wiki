// Gets all releases of the current track *except* this track itself;
// in other words, all other releases of the current track.

import {input, templateCompositeFrom} from '#composite';

export default templateCompositeFrom({
  annotation: `withOtherReleases`,

  outputs: ['#otherReleases'],

  steps: () => [
    {
      dependencies: [input.myself(), 'allReleases'],
      compute: (continuation, {
        [input.myself()]: thisTrack,
        ['allReleases']: allReleases,
      }) => continuation({
        ['#otherReleases']:
          allReleases.filter(track => track !== thisTrack),
      }),
    },
  ],
});
