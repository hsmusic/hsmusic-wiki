// Nice 'n simple shorthand for an exposed-only flag which is true when any
// contributions are present in the specified property.

import {input, templateCompositeFrom} from '#composite';
import {isContributionList} from '#validators';

import {exposeDependency, withResultOfAvailabilityCheck}
  from '#composite/control-flow';

export default templateCompositeFrom({
  annotation: `contribsPresent`,

  compose: false,

  inputs: {
    contribs: input.staticDependency({
      validate: isContributionList,
      acceptsNull: true,
    }),
  },

  steps: () => [
    withResultOfAvailabilityCheck({
      from: input('contribs'),
      mode: input.value('empty'),
    }),

    exposeDependency({dependency: '#availability'}),
  ],
});
