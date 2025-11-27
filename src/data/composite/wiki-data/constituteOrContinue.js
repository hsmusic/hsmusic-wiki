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
    property: input({type: 'string', acceptsNull: true}),
    from: input({type: 'object', acceptsNull: true}),
    mode: inputAvailabilityCheckMode(),
  },

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: input('property'),
    }),

    withPropertyFromObject({
      property: input('property'),
      object: input('from'),
    }),

    exposeDependencyOrContinue({
      dependency: '#value',
    }),
  ],
});
