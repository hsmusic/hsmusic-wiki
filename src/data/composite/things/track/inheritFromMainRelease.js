// Early exits with the value for the same property as specified on the
// main release, if this track is a secondary release, and otherwise continues
// without providing any further dependencies.

import {input, templateCompositeFrom} from '#composite';

import {exposeDependency, raiseOutputWithoutDependency}
  from '#composite/control-flow';

import withPropertyFromMainRelease
  from './withPropertyFromMainRelease.js';

export default templateCompositeFrom({
  annotation: `inheritFromMainRelease`,

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: 'isSecondaryRelease',
      mode: input.value('falsy'),
    }),

    withPropertyFromMainRelease({
      property: input.thisProperty(),
    }),

    exposeDependency({
      dependency: '#mainReleaseValue',
    }),
  ],
});
