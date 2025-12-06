// A file extension! Or the default, if provided when calling this.

import {input, templateCompositeFrom} from '#composite';
import {isFileExtension} from '#validators';

export default templateCompositeFrom({
  annotation: 'name',

  compose: false,

  inputs: {
    default: input({validate: isFileExtension, acceptsNull: true}),
  },

  update: {
    validate: isFileExtension,
  },

  steps: () => [
    {
      dependencies: [input('default')],
      transform: (value, {[input('default')]: defaultValue}) =>
        value ?? defaultValue,
    },
  ],
});