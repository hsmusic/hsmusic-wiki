// Shorthand for exiting if the contribution list (usually a property's update
// value) resolves to empty - ensuring that the later computed results are only
// returned if these contributions are present.

import {input, templateCompositeFrom} from '#composite';
import {isContributionList} from '#validators';

import {withResultOfAvailabilityCheck} from '#composite/control-flow';

import withResolvedContribs from './withResolvedContribs.js';

export default templateCompositeFrom({
  annotation: `exitWithoutContribs`,

  inputs: {
    contribs: input({
      validate: isContributionList,
      acceptsNull: true,
    }),

    value: input({defaultValue: null}),
  },

  steps: () => [
    withResolvedContribs({
      from: input('contribs'),
      date: input.value(null),
    }),

    // TODO: Fairly certain exitWithoutDependency would be sufficient here.

    withResultOfAvailabilityCheck({
      from: '#resolvedContribs',
      mode: input.value('empty'),
    }),

    {
      dependencies: ['#availability', input('value')],
      compute: (continuation, {
        ['#availability']: availability,
        [input('value')]: value,
      }) =>
        (availability
          ? continuation()
          : continuation.exit(value)),
    },
  ],
});
