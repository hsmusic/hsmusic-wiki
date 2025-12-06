import {input, templateCompositeFrom} from '#composite';

import {withPropertyFromObject} from '#composite/data';

import {
  exposeDependencyOrContinue,
  inputAvailabilityCheckMode,
  raiseOutputWithoutDependency,
} from '#composite/control-flow';

export default templateCompositeFrom({
  annotation: `constituteFrom`,

  inputs: {
    object: input({type: 'object', acceptsNull: true}),
    property: input({type: 'string', acceptsNull: true}),
    mode: inputAvailabilityCheckMode(),
  },

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: input('property'),
    }),

    withPropertyFromObject({
      object: input('object'),
      property: input('property'),
    }),

    exposeDependencyOrContinue({
      dependency: '#value',
    }),
  ],
});
