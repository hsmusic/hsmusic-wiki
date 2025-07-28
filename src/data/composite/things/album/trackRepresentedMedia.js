import {input, templateCompositeFrom} from '#composite';
import {isRepresentedMedia} from '#validators';

import {exposeDependency, withResultOfAvailabilityCheck}
  from '#composite/control-flow';
import {withResolvedAnnotatedReferenceList} from '#composite/wiki-data';
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

    withResolvedAnnotatedReferenceList({
      list: input.updateValue({validate: isRepresentedMedia}),
      find: soupyFind.input('medium'),

      thing: input.value('medium'),
    }),

    {
      dependencies: ['#availability', '#resolvedAnnotatedReferenceList'],
      compute: (continuation, {
        ['#availability']: availability,
        ['#resolvedAnnotatedReferenceList']: resolvedAnnotatedReferenceList,
      }) =>
        (availability
          ? continuation.exit(resolvedAnnotatedReferenceList)
          : continuation()),
    },

    withResolvedAnnotatedReferenceList({
      list: 'representedMedia',
      find: soupyFind.input('medium'),

      thing: input.value('medium'),
    }),

    exposeDependency({
      dependency: '#resolvedAnnotatedReferenceList',
    }),
  ],
});
