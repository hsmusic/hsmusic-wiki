// Exposes the update value of an {update: true} property as it is,
// or continues if it's unavailable.
//
// See withResultOfAvailabilityCheck for {mode} options.
//
// Provide {validate} here to conveniently set a custom validation check
// for this property's update value.
//

import {input, templateCompositeFrom} from '#composite';

import exposeDependencyOrContinue from './exposeDependencyOrContinue.js';
import inputAvailabilityCheckMode from './inputAvailabilityCheckMode.js';

export default templateCompositeFrom({
  annotation: `exposeUpdateValueOrContinue`,

  inputs: {
    mode: inputAvailabilityCheckMode(),

    validate: input({
      type: 'function',
      defaultValue: null,
    }),
  },

  update: ({
    [input.staticValue('validate')]: validate,
  }) =>
    (validate
      ? {validate}
      : {}),

  steps: () => [
    exposeDependencyOrContinue({
      dependency: input.updateValue(),
      mode: input('mode'),
    }),
  ],
});
