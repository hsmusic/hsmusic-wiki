// Early exits with the value for the same property as specified on the
// main release, if this track is a secondary release, and otherwise continues
// without providing any further dependencies.
//
// Like withMainRelease, this will early exit (with notFoundValue) if the
// main release is specified by reference and that reference doesn't
// resolve to anything.

import {input, templateCompositeFrom} from '#composite';

import {exposeDependency, raiseOutputWithoutDependency}
  from '#composite/control-flow';

import withPropertyFromMainRelease
  from './withPropertyFromMainRelease.js';

export default templateCompositeFrom({
  annotation: `inheritFromMainRelease`,

  inputs: {
    notFoundValue: input({
      defaultValue: null,
    }),
  },

  steps: () => [
    withPropertyFromMainRelease({
      property: input.thisProperty(),
      notFoundValue: input('notFoundValue'),
    }),

    raiseOutputWithoutDependency({
      dependency: '#isSecondaryRelease',
      mode: input.value('falsy'),
    }),

    exposeDependency({
      dependency: '#mainReleaseValue',
    }),
  ],
});
