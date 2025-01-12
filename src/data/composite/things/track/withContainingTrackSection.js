// Gets the track section containing this track from its album's track list.

import {templateCompositeFrom} from '#composite';

import {withUniqueReferencingThing} from '#composite/wiki-data';
import {soupyReverse} from '#composite/wiki-properties';

export default templateCompositeFrom({
  annotation: `withContainingTrackSection`,

  outputs: ['#trackSection'],

  steps: () => [
    withUniqueReferencingThing({
      reverse: soupyReverse.input('trackSectionsWhichInclude'),
    }).outputs({
      ['#uniqueReferencingThing']: '#trackSection',
    }),
  ],
});
