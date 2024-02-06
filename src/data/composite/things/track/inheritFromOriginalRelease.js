// Early exits with a value inherited from the original release, if
// this track is a rerelease, and otherwise continues with no further
// dependencies provided. If allowOverride is true, then the continuation
// will also be called if the original release exposed the requested
// property as null.
//
// Like withOriginalRelease, this will early exit (with notFoundValue) if the
// original release is specified by reference and that reference doesn't
// resolve to anything.

import {input, templateCompositeFrom} from '#composite';

import withOriginalRelease from './withOriginalRelease.js';

export default templateCompositeFrom({
  annotation: `inheritFromOriginalRelease`,

  inputs: {
    property: input({type: 'string'}),
    allowOverride: input({type: 'boolean', defaultValue: false}),
    notFoundValue: input({defaultValue: null}),
  },

  steps: () => [
    withOriginalRelease({
      notFoundValue: input('notFoundValue'),
    }),

    {
      dependencies: [
        '#originalRelease',
        input('property'),
        input('allowOverride'),
      ],

      compute: (continuation, {
        ['#originalRelease']: originalRelease,
        [input('property')]: originalProperty,
        [input('allowOverride')]: allowOverride,
      }) => {
        if (!originalRelease) return continuation();

        const value = originalRelease[originalProperty];
        if (allowOverride && value === null) return continuation();

        return continuation.exit(value);
      },
    },
  ],
});
