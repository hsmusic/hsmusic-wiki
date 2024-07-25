// Raises if this property's update value isn't available.
// See withResultOfAvailabilityCheck for {mode} options!

import {input, templateCompositeFrom} from '#composite';

import inputAvailabilityCheckMode from './inputAvailabilityCheckMode.js';
import withResultOfAvailabilityCheck from './withResultOfAvailabilityCheck.js';

export default templateCompositeFrom({
  annotation: `raiseOutputWithoutUpdateValue`,

  inputs: {
    mode: inputAvailabilityCheckMode(),
    output: input.staticValue({defaultValue: {}}),
  },

  outputs: ({
    [input.staticValue('output')]: output,
  }) => Object.keys(output),

  steps: () => [
    withResultOfAvailabilityCheck({
      from: input.updateValue(),
      mode: input('mode'),
    }),

    // TODO: A bit of a kludge, below. Other "do something with the update
    // value" type functions can get by pretty much just passing that value
    // as an input (input.updateValue()) into the corresponding "do something
    // with a dependency/arbitrary value" function. But we can't do that here,
    // because the special behavior, raiseOutputAbove(), only works to raise
    // output above the composition it's *directly* nested in. Other languages
    // have a throw/catch system that might serve as inspiration for something
    // better here.

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
