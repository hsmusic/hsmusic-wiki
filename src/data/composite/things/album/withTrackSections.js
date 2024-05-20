import {input, templateCompositeFrom} from '#composite';

import find from '#find';

import {withResolvedReferenceList} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withTrackSections`,

  outputs: ['#trackSections'],

  steps: () => [
    withResolvedReferenceList({
      list: 'trackSections',
      data: 'ownTrackSectionData',
      find: input.value(find.unqualifiedTrackSection),
    }).outputs({
      ['#resolvedReferenceList']: '#trackSections',
    }),
  ],
});
