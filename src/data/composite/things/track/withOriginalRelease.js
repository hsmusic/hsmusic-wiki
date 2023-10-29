// Just includes the original release of this track as a dependency.
// If this track isn't a rerelease, then it'll provide null, unless the
// {selfIfOriginal} option is set, in which case it'll provide this track
// itself. Note that this will early exit if the original release is
// specified by reference and that reference doesn't resolve to anything.
// Outputs to '#originalRelease' by default.

import {input, templateCompositeFrom} from '#composite';
import find from '#find';
import {validateWikiData} from '#validators';

import {withResolvedReference} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withOriginalRelease`,

  inputs: {
    selfIfOriginal: input({type: 'boolean', defaultValue: false}),

    data: input({
      validate: validateWikiData({referenceType: 'track'}),
      defaultDependency: 'trackData',
    }),
  },

  outputs: ['#originalRelease'],

  steps: () => [
    withResolvedReference({
      ref: 'originalReleaseTrack',
      data: input('data'),
      find: input.value(find.track),
      notFoundMode: input.value('exit'),
    }).outputs({
      ['#resolvedReference']: '#originalRelease',
    }),

    {
      dependencies: [
        input.myself(),
        input('selfIfOriginal'),
        '#originalRelease',
      ],

      compute: (continuation, {
        [input.myself()]: track,
        [input('selfIfOriginal')]: selfIfOriginal,
        ['#originalRelease']: originalRelease,
      }) =>
        continuation({
          ['#originalRelease']:
            (originalRelease ??
              (selfIfOriginal
                ? track
                : null)),
        }),
    },
  ],
});
