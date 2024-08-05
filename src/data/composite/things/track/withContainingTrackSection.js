// Gets the track section containing this track from its album's track list.

import {input, templateCompositeFrom} from '#composite';

import {withUniqueReferencingThing} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withContainingTrackSection`,

  outputs: ['#trackSection'],

  steps: () => [
    withUniqueReferencingThing({
      data: 'trackSectionData',
      list: input.value('tracks'),
    }).outputs({
      ['#uniqueReferencingThing']: '#trackSection',
    }),
  ],
});
