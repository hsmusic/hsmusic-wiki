import {input, templateCompositeFrom} from '#composite';

import {inputAvailabilityCheckMode,} from '#composite/control-flow';

import constituteOrContinue from './constituteOrContinue.js';

export default templateCompositeFrom({
  annotation: `constituteFrom`,

  inputs: {
    object: input({type: 'object', acceptsNull: true}),
    property: input({type: 'string', acceptsNull: true}),
    else: input({defaultValue: null}),
    mode: inputAvailabilityCheckMode(),
  },

  compose: false,

  steps: () => [
    constituteOrContinue({
      object: input('object'),
      property: input('property'),
      mode: input('mode'),
    }),

    {
      dependencies: [input('else')],
      compute: ({[input('else')]: fallback}) => fallback,
    },
  ],
});
