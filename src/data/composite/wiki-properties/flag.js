// Straightforward flag descriptor for a variety of property purposes.
// Provide a default value, true or false!

import {input, templateCompositeFrom} from '#composite';
import {isBoolean} from '#validators';

export default templateCompositeFrom({
  annotation: 'flag',

  compose: false,

  inputs: {
    default: input({type: 'boolean'}),
  },

  update: {
    validate: isBoolean,
  },

  steps: () => [
    {
      dependencies: [input('default')],
      transform: (value, {[input('default')]: defaultValue}) =>
        value ?? defaultValue,
    },
  ],
});