import {input, templateCompositeFrom} from '#composite';

import {exitWithoutDependency} from '#composite/control-flow';

import withOriginalRelease from './withOriginalRelease.js';

export default templateCompositeFrom({
  annotation: `withOtherReleases`,

  outputs: ['#otherReleases'],

  steps: () => [
    exitWithoutDependency({
      dependency: 'trackData',
      mode: input.value('empty'),
    }),

    withOriginalRelease({
      selfIfOriginal: input.value(true),
      notFoundValue: input.value([]),
    }),

    {
      dependencies: [input.myself(), '#originalRelease', 'trackData'],
      compute: (continuation, {
        [input.myself()]: thisTrack,
        ['#originalRelease']: originalRelease,
        trackData,
      }) => continuation({
        ['#otherReleases']:
          (originalRelease === thisTrack
            ? []
            : [originalRelease])
            .concat(trackData.filter(track =>
              track !== originalRelease &&
              track !== thisTrack &&
              track.originalReleaseTrack === originalRelease)),
      }),
    },
  ],
});
