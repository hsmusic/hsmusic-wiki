// Exposes a dependency exactly as it is; this is typically the base of a
// composition which was created to serve as one property's descriptor.
//
// Please note that this *doesn't* verify that the dependency exists, so
// if you provide the wrong name or it hasn't been set by a previous
// compositional step, the property will be exposed as undefined instead
// of null.

import {input, templateCompositeFrom} from '#composite';

export default templateCompositeFrom({
  annotation: `exposeDependency`,

  compose: false,

  inputs: {
    dependency: input.staticDependency({acceptsNull: true}),
  },

  steps: () => [
    {
      dependencies: [input('dependency')],
      compute: ({
        [input('dependency')]: dependency
      }) => dependency,
    },
  ],
});
