// Just includes the original release of this track as a dependency.
// If this track isn't a rerelease, then it'll provide null, unless the
// {selfIfOriginal} option is set, in which case it'll provide this track
// itself. This will early exit (with notFoundValue) if the original release
// is specified by reference and that reference doesn't resolve to anything.

import {input, templateCompositeFrom} from '#composite';
import find from '#find';
import {validateWikiData} from '#validators';

import {exitWithoutDependency, withResultOfAvailabilityCheck}
  from '#composite/control-flow';
import {withResolvedReference} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withOriginalRelease`,

  inputs: {
    selfIfOriginal: input({type: 'boolean', defaultValue: false}),

    data: input({
      validate: validateWikiData({referenceType: 'track'}),
      defaultDependency: 'trackData',
    }),

    notFoundValue: input({defaultValue: null}),
  },

  outputs: ['#originalRelease'],

  steps: () => [
    withResultOfAvailabilityCheck({
      from: 'originalReleaseTrack',
    }),

    {
      dependencies: [
        input.myself(),
        input('selfIfOriginal'),
        '#availability',
      ],

      compute: (continuation, {
        [input.myself()]: track,
        [input('selfIfOriginal')]: selfIfOriginal,
        '#availability': availability,
      }) =>
        (availability
          ? continuation()
          : continuation.raiseOutput({
              ['#originalRelease']:
                (selfIfOriginal ? track : null),
            })),
    },

    withResolvedReference({
      ref: 'originalReleaseTrack',
      data: input('data'),
      find: input.value(find.track),
    }),

    exitWithoutDependency({
      dependency: '#resolvedReference',
      value: input('notFoundValue'),
    }),

    {
      dependencies: ['#resolvedReference'],

      compute: (continuation, {
        ['#resolvedReference']: resolvedReference,
      }) =>
        continuation({
          ['#originalRelease']: resolvedReference,
        }),
    },
  ],
});
