import {input, templateCompositeFrom} from '#composite';

import {inputAvailabilityCheckMode,} from '#composite/control-flow';

import constituteOrContinue from './constituteOrContinue.js';

export default templateCompositeFrom({
  annotation: `constituteFrom`,

  inputs: {
    property: input({type: 'string', acceptsNull: true}),
    from: input({type: 'object', acceptsNull: true}),
    else: input({defaultValue: null}),
    mode: inputAvailabilityCheckMode(),
  },

  compose: false,

  steps: () => [
    constituteOrContinue({
      property: input('property'),
      from: input('from'),
      mode: input('mode'),
    }),

    {
      dependencies: [input('else')],
      compute: ({[input('else')]: fallback}) => fallback,
    },
  ],
});
