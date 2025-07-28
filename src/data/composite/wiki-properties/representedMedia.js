import {input, templateCompositeFrom} from '#composite';

import annotatedReferenceList from './annotatedReferenceList.js';
import soupyFind from './soupyFind.js';

export default templateCompositeFrom({
  annotation: `representedMedia`,

  compose: false,

  steps: () => [
    annotatedReferenceList({
      referenceType: input.value('medium'),
      find: soupyFind.input('medium'),

      thing: input.value('medium'),
    }),
  ],
});
