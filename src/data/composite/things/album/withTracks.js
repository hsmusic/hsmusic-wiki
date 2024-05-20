import {input, templateCompositeFrom} from '#composite';

import {exitWithoutDependency, raiseOutputWithoutDependency}
  from '#composite/control-flow';
import {withFlattenedList, withPropertyFromList} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withTracks`,

  outputs: ['#tracks'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: 'trackSections',
      output: input.value({
        '#tracks': [],
      }),
    }),

    withPropertyFromList({
      list: 'trackSections',
      property: input.value('tracks'),
    }),

    withFlattenedList({
      list: '#trackSections.tracks',
    }).outputs({
      ['#flattenedList']: '#tracks',
    }),
  ],
});
