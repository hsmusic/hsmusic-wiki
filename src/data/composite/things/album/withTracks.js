import {input, templateCompositeFrom} from '#composite';

import {withFlattenedList, withPropertyFromList} from '#composite/data';
import {withResolvedReferenceList} from '#composite/wiki-data';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

export default templateCompositeFrom({
  annotation: `withTracks`,

  outputs: ['#tracks'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: 'trackSections',
      output: input.value({'#tracks': []}),
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
