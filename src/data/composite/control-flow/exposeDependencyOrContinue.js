// Exposes a dependency as it is, or continues if it's unavailable.
// See withResultOfAvailabilityCheck for {mode} options.

import {input, templateCompositeFrom} from '#composite';

import inputAvailabilityCheckMode from './inputAvailabilityCheckMode.js';
import withResultOfAvailabilityCheck from './withResultOfAvailabilityCheck.js';

export default templateCompositeFrom({
  annotation: `exposeDependencyOrContinue`,

  inputs: {
    dependency: input({acceptsNull: true}),
    mode: inputAvailabilityCheckMode(),
  },

  steps: () => [
    withResultOfAvailabilityCheck({
      from: input('dependency'),
      mode: input('mode'),
    }),

    {
      dependencies: ['#availability', input('dependency')],
      compute: (continuation, {
        ['#availability']: availability,
        [input('dependency')]: dependency,
      }) =>
        (availability
          ? continuation.exit(dependency)
          : continuation()),
    },
  ],
});
