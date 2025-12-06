// A wiki data object's name! Its directory (i.e. unique identifier) will be
// computed based on this value if not otherwise specified.

import {input, templateCompositeFrom} from '#composite';
import {isName} from '#validators';

export default templateCompositeFrom({
  annotation: 'name',

  compose: false,

  inputs: {
    default: input({type: 'string'}),
  },

  update: {
    validate: isName,
  },

  steps: () => [
    {
      dependencies: [input('default')],
      transform: (value, {[input('default')]: defaultValue}) =>
        value ?? defaultValue,
    },
  ],
});