import {input, templateCompositeFrom} from '#composite';

import {withFlattenedList, withPropertyFromList} from '#composite/data';
import {withResolvedReferenceList} from '#composite/wiki-data';

import withTrackSections from './withTrackSections.js';

export default templateCompositeFrom({
  annotation: `withTracks`,

  outputs: ['#tracks'],

  steps: () => [
    withTrackSections(),

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
