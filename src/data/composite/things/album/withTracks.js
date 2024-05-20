import {input, templateCompositeFrom} from '#composite';

import find from '#find';

import {exitWithoutDependency} from '#composite/control-flow';
import {withFlattenedList, withPropertyFromList} from '#composite/data';
import {withResolvedReferenceList} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withTracks`,

  outputs: ['#tracks'],

  steps: () => [
    withResolvedReferenceList({
      list: 'trackSections',
      data: 'ownTrackSectionData',
      find: input.value(find.unqualifiedTrackSection),
    }).outputs({
      ['#resolvedReferenceList']: '#trackSections',
    }),

    withPropertyFromList({
      list: '#trackSections',
      property: input.value('tracks'),
    }),

    withFlattenedList({
      list: '#trackSections.tracks',
    }).outputs({
      ['#flattenedList']: '#tracks',
    }),
  ],
});
