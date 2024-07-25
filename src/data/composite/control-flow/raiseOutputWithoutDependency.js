// Raises if a dependency isn't available.
// See withResultOfAvailabilityCheck for {mode} options.

import {input, templateCompositeFrom} from '#composite';

import inputAvailabilityCheckMode from './inputAvailabilityCheckMode.js';
import withResultOfAvailabilityCheck from './withResultOfAvailabilityCheck.js';

export default templateCompositeFrom({
  annotation: `raiseOutputWithoutDependency`,

  inputs: {
    dependency: input({acceptsNull: true}),
    mode: inputAvailabilityCheckMode(),
    output: input.staticValue({defaultValue: {}}),
  },

  outputs: ({
    [input.staticValue('output')]: output,
  }) => Object.keys(output),

  steps: () => [
    withResultOfAvailabilityCheck({
      from: input('dependency'),
      mode: input('mode'),
    }),

    {
      dependencies: ['#availability', input('output')],
      compute: (continuation, {
        ['#availability']: availability,
        [input('output')]: output,
      }) =>
        (availability
          ? continuation()
          : continuation.raiseOutputAbove(output)),
    },
  ],
});
