// Early exits if a dependency isn't available.
// See withResultOfAvailabilityCheck for {mode} options.

import {input, templateCompositeFrom} from '#composite';

import inputAvailabilityCheckMode from './inputAvailabilityCheckMode.js';
import withResultOfAvailabilityCheck from './withResultOfAvailabilityCheck.js';

export default templateCompositeFrom({
  annotation: `exitWithoutDependency`,

  inputs: {
    dependency: input({acceptsNull: true}),
    mode: inputAvailabilityCheckMode(),
    value: input({defaultValue: null}),
  },

  steps: () => [
    withResultOfAvailabilityCheck({
      from: input('dependency'),
      mode: input('mode'),
    }),

    {
      dependencies: ['#availability', input('value')],
      compute: (continuation, {
        ['#availability']: availability,
        [input('value')]: value,
      }) =>
        (availability
          ? continuation()
          : continuation.exit(value)),
    },
  ],
});
