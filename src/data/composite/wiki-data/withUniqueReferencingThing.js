// Like withReverseReferenceList, but this is specifically for special "unique"
// references, meaning this thing is referenced by exactly one or zero things
// in the data list.

import {input, templateCompositeFrom} from '#composite';

import gobbleSoupyReverse from './gobbleSoupyReverse.js';
import inputSoupyReverse from './inputSoupyReverse.js';
import inputWikiData from './inputWikiData.js';

import withResolvedReverse from './helpers/withResolvedReverse.js';

export default templateCompositeFrom({
  annotation: `withUniqueReferencingThing`,

  inputs: {
    data: inputWikiData({allowMixedTypes: true}),
    reverse: inputSoupyReverse(),
  },

  outputs: ['#uniqueReferencingThing'],

  steps: () => [
    gobbleSoupyReverse({
      reverse: input('reverse'),
    }),

    withResolvedReverse({
      data: input('data'),
      reverse: '#reverse',
      options: input.value({unique: true}),
    }).outputs({
      '#resolvedReverse': '#uniqueReferencingThing',
    }),
  ],
});
