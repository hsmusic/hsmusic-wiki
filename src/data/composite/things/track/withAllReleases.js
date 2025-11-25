// Gets all releases of the current track. All items of the outputs are
// distinct Track objects; one track is the main release; all else are
// secondary releases of that main release; and one item, which may be
// the main release or one of the secondary releases, is the current
// track. The results are sorted by date, and it is possible that the
// main release is not actually the earliest/first.

import {input, templateCompositeFrom} from '#composite';
import {sortByDate} from '#sort';

import {withPropertyFromObject} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withAllReleases`,

  outputs: ['#allReleases'],

  steps: () => [
    {
      dependencies: [
        'mainReleaseTrack',
        'secondaryReleases',
        input.myself(),
      ],

      compute: (continuation, {
        mainReleaseTrack,
        secondaryReleases,
        [input.myself()]: thisTrack,
      }) =>
        (mainReleaseTrack
          ? continuation({
              ['#mainReleaseTrack']: mainReleaseTrack,
              ['#secondaryReleaseTracks']: mainReleaseTrack.secondaryReleases,
            })
          : continuation({
              ['#mainReleaseTrack']: thisTrack,
              ['#secondaryReleaseTracks']: secondaryReleases,
            })),
    },

    {
      dependencies: [
        '#mainReleaseTrack',
        '#secondaryReleaseTracks',
      ],

      compute: (continuation, {
        ['#mainReleaseTrack']: mainReleaseTrack,
        ['#secondaryReleaseTracks']: secondaryReleaseTracks,
      }) => continuation({
        ['#allReleases']:
          sortByDate([mainReleaseTrack, ...secondaryReleaseTracks]),
      }),
    },
  ],
});
