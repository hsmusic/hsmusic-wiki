// Early exits if this property's update value isn't available.
// See withResultOfAvailabilityCheck for {mode} options.

import {input, templateCompositeFrom} from '#composite';

import exitWithoutDependency from './exitWithoutDependency.js';
import inputAvailabilityCheckMode from './inputAvailabilityCheckMode.js';

export default templateCompositeFrom({
  annotation: `exitWithoutUpdateValue`,

  inputs: {
    mode: inputAvailabilityCheckMode(),
    value: input({defaultValue: null}),
  },

  steps: () => [
    exitWithoutDependency({
      dependency: input.updateValue(),
      mode: input('mode'),
      value: input('value'),
    }),
  ],
});
