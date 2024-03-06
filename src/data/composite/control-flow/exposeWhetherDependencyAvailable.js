// Exposes true if a dependency is available, and false otherwise,
// or the reverse if the `negate` input is set true.
//
// See withResultOfAvailabilityCheck for {mode} options.

import {input, templateCompositeFrom} from '#composite';

import inputAvailabilityCheckMode from './inputAvailabilityCheckMode.js';
import withResultOfAvailabilityCheck from './withResultOfAvailabilityCheck.js';

export default templateCompositeFrom({
  annotation: `exposeWhetherDependencyAvailable`,

  compose: false,

  inputs: {
    dependency: input({acceptsNull: true}),

    mode: inputAvailabilityCheckMode(),

    negate: input({type: 'boolean', defaultValue: false}),
  },

  steps: () => [
    withResultOfAvailabilityCheck({
      from: input('dependency'),
      mode: input('mode'),
    }),

    {
      dependencies: ['#availability', input('negate')],

      compute: ({
        ['#availability']: availability,
        [input('negate')]: negate,
      }) =>
        (negate
          ? !availability
          : availability),
    },
  ],
});
