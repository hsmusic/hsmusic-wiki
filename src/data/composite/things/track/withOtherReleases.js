import {input, templateCompositeFrom} from '#composite';

import {exitWithoutDependency} from '#composite/control-flow';

import withMainRelease from './withMainRelease.js';

export default templateCompositeFrom({
  annotation: `withOtherReleases`,

  outputs: ['#otherReleases'],

  steps: () => [
    exitWithoutDependency({
      dependency: 'trackData',
      mode: input.value('empty'),
    }),

    withMainRelease({
      selfIfMain: input.value(true),
      notFoundValue: input.value([]),
    }),

    // TODO: Jegus shouldn't this be a proper reverse list
    {
      dependencies: [input.myself(), '#mainRelease', 'trackData'],
      compute: (continuation, {
        [input.myself()]: thisTrack,
        ['#mainRelease']: mainRelease,
        trackData,
      }) => continuation({
        ['#otherReleases']:
          (mainRelease === thisTrack
            ? []
            : [mainRelease])
            .concat(trackData.filter(track =>
              track !== mainRelease &&
              track !== thisTrack &&
              track.mainReleaseTrack === mainRelease)),
      }),
    },
  ],
});
