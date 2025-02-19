// Just includes the main release of this track as a dependency.
// If this track isn't a secondary release, then it'll provide null, unless
// the {selfIfMain} option is set, in which case it'll provide this track
// itself. This will early exit (with notFoundValue) if the main release
// is specified by reference and that reference doesn't resolve to anything.

import {input, templateCompositeFrom} from '#composite';

import {exitWithoutDependency, withResultOfAvailabilityCheck}
  from '#composite/control-flow';
import {withResolvedReference} from '#composite/wiki-data';
import {soupyFind} from '#composite/wiki-properties';

export default templateCompositeFrom({
  annotation: `withMainRelease`,

  inputs: {
    selfIfMain: input({type: 'boolean', defaultValue: false}),
    notFoundValue: input({defaultValue: null}),
  },

  outputs: ['#mainRelease'],

  steps: () => [
    withResultOfAvailabilityCheck({
      from: 'mainReleaseTrack',
    }),

    {
      dependencies: [
        input.myself(),
        input('selfIfMain'),
        '#availability',
      ],

      compute: (continuation, {
        [input.myself()]: track,
        [input('selfIfMain')]: selfIfMain,
        '#availability': availability,
      }) =>
        (availability
          ? continuation()
          : continuation.raiseOutput({
              ['#mainRelease']:
                (selfIfMain ? track : null),
            })),
    },

    withResolvedReference({
      ref: 'mainReleaseTrack',
      find: soupyFind.input('track'),
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
          ['#mainRelease']: resolvedReference,
        }),
    },
  ],
});
