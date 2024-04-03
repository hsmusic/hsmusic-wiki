// Exposes a constant value exactly as it is; like exposeDependency, this
// is typically the base of a composition serving as a particular property
// descriptor. It generally follows steps which will conditionally early
// exit with some other value, with the exposeConstant base serving as the
// fallback default value.

import {input, templateCompositeFrom} from '#composite';

export default templateCompositeFrom({
  annotation: `exposeConstant`,

  compose: false,

  inputs: {
    value: input.staticValue({acceptsNull: true}),
  },

  steps: () => [
    {
      dependencies: [input('value')],
      compute: ({
        [input('value')]: value,
      }) => value,
    },
  ],
});
