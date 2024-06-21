// Shorthand for checking if the track is a rerelease and exposing a value
// if it is.

import {input, templateCompositeFrom} from '#composite';

import {withResultOfAvailabilityCheck} from '#composite/control-flow';

import withOriginalRelease from './withOriginalRelease.js';

export default templateCompositeFrom({
  annotation: `exitWithoutUniqueCoverArt`,

  inputs: {
    value: input({defaultValue: null}),
  },

  steps: () => [
    withOriginalRelease(),

    withResultOfAvailabilityCheck({
      from: '#originalRelease',
    }),

    {
      dependencies: ['#availability'],
      compute: (continuation, {
        ['#availability']: availability,
      }) =>
        (availability
          ? continuation()
          : continuation.raiseOutput()),
    },

    {
      dependencies: [input('value')],
      compute: (continuation, {
        [input('value')]: value,
      }) =>
        continuation.exit(value),
    },
  ],
});
