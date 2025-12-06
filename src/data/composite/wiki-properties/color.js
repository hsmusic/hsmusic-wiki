// A color! This'll be some CSS-ready value.

import {input, templateCompositeFrom} from '#composite';
import {isColor} from '#validators';

export default templateCompositeFrom({
  annotation: 'color',

  compose: false,

  inputs: {
    default: input({validate: isColor, defaultValue: null}),
  },

  update: {
    validate: isColor,
  },

  steps: () => [
    {
      dependencies: [input('default')],
      transform: (value, {[input('default')]: defaultValue}) =>
        value ?? defaultValue,
    },
  ],
});