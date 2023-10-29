import {input, templateCompositeFrom} from '#composite';
import find from '#find';

import {exitWithoutDependency, raiseOutputWithoutDependency}
  from '#composite/control-flow';
import {withResolvedReferenceList} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withTracks`,

  outputs: ['#tracks'],

  steps: () => [
    exitWithoutDependency({
      dependency: 'trackData',
      value: input.value([]),
    }),

    raiseOutputWithoutDependency({
      dependency: 'trackSections',
      mode: input.value('empty'),
      output: input.value({
        ['#tracks']: [],
      }),
    }),

    {
      dependencies: ['trackSections'],
      compute: (continuation, {trackSections}) =>
        continuation({
          '#trackRefs': trackSections
            .flatMap(section => section.tracks ?? []),
        }),
    },

    withResolvedReferenceList({
      list: '#trackRefs',
      data: 'trackData',
      find: input.value(find.track),
    }),

    {
      dependencies: ['#resolvedReferenceList'],
      compute: (continuation, {
        ['#resolvedReferenceList']: resolvedReferenceList,
      }) => continuation({
        ['#tracks']: resolvedReferenceList,
      })
    },
  ],
});
