// Gets all releases of the current track. All items of the outputs are
// distinct Track objects; one track is the main release; all else are
// secondary releases of that main release; and one item, which may be
// the main release or one of the secondary releases, is the current
// track. The results are sorted by date, and it is possible that the
// main release is not actually the earliest/first.

import {input, templateCompositeFrom} from '#composite';
import {sortByDate} from '#sort';

import {withPropertyFromObject} from '#composite/data';

import withMainReleaseTrack from './withMainReleaseTrack.js';

export default templateCompositeFrom({
  annotation: `withAllReleases`,

  outputs: ['#allReleases'],

  steps: () => [
    withMainReleaseTrack({
      selfIfMain: input.value(true),
      notFoundValue: input.value([]),
    }),

    // We don't talk about bruno no no
    // Yes, this can perform a normal access equivalent to
    // `this.secondaryReleases` from within a data composition.
    // Oooooooooooooooooooooooooooooooooooooooooooooooo
    withPropertyFromObject({
      object: '#mainReleaseTrack',
      property: input.value('secondaryReleases'),
    }),

    {
      dependencies: [
        '#mainReleaseTrack',
        '#mainReleaseTrack.secondaryReleases',
      ],

      compute: (continuation, {
        ['#mainReleaseTrack']: mainReleaseTrack,
        ['#mainReleaseTrack.secondaryReleases']: secondaryReleases,
      }) => continuation({
        ['#allReleases']:
          sortByDate([mainReleaseTrack, ...secondaryReleases]),
      }),
    },
  ],
});
