// Early exits with the value for the same property as specified on the
// original release, if this track is a rerelease, and otherwise continues
// without providing any further dependencies.
//
// Like withOriginalRelease, this will early exit (with notFoundValue) if the
// original release is specified by reference and that reference doesn't
// resolve to anything.

import {input, templateCompositeFrom} from '#composite';

import {exposeDependency, raiseOutputWithoutDependency}
  from '#composite/control-flow';

import withPropertyFromOriginalRelease
  from './withPropertyFromOriginalRelease.js';

export default templateCompositeFrom({
  annotation: `inheritFromOriginalRelease`,

  inputs: {
    notFoundValue: input({
      defaultValue: null,
    }),
  },

  steps: () => [
    withPropertyFromOriginalRelease({
      property: input.thisProperty(),
      notFoundValue: input('notFoundValue'),
    }),

    raiseOutputWithoutDependency({
      dependency: '#isRerelease',
      mode: input.value('falsy'),
    }),

    exposeDependency({
      dependency: '#originalValue',
    }),
  ],
});
