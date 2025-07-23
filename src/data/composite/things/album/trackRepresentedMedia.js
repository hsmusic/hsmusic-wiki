import {input, templateCompositeFrom} from '#composite';
import {validateReferenceList} from '#validators';

import {exposeDependency, withResultOfAvailabilityCheck}
  from '#composite/control-flow';
import {withResolvedReferenceList} from '#composite/wiki-data';
import {soupyFind} from '#composite/wiki-properties';

export default templateCompositeFrom({
  annotation: `trackRepresentedMedia`,

  compose: false,

  steps: () => [
    // An empty list is a valid override.
    withResultOfAvailabilityCheck({
      from: input.updateValue(),
      mode: input.value('null'),
    }),

    withResolvedReferenceList({
      list: input.updateValue({
        validate: validateReferenceList('medium'),
      }),

      find: soupyFind.input('medium'),
    }),

    {
      dependencies: ['#availability', '#resolvedReferenceList'],
      compute: (continuation, {
        ['#availability']: availability,
        ['#resolvedReferenceList']: resolvedReferenceList,
      }) =>
        (availability
          ? continuation.exit(resolvedReferenceList)
          : continuation()),
    },

    withResolvedReferenceList({
      list: 'representedMedia',
      find: soupyFind.input('medium'),
    }),

    exposeDependency({
      dependency: '#resolvedReferenceList',
    }),
  ],
});
