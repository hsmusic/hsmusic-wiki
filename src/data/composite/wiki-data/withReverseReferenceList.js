// Check out the info on reverseReferenceList!
// This is its composable form.

import {input, templateCompositeFrom} from '#composite';

import gobbleSoupyReverse from './gobbleSoupyReverse.js';
import inputSoupyReverse from './inputSoupyReverse.js';
import inputWikiData from './inputWikiData.js';

import withResolvedReverse from './helpers/withResolvedReverse.js';

export default templateCompositeFrom({
  annotation: `withReverseReferenceList`,

  inputs: {
    data: inputWikiData({allowMixedTypes: true}),
    reverse: inputSoupyReverse(),
  },

  outputs: ['#reverseReferenceList'],

  steps: () => [
    gobbleSoupyReverse({
      reverse: input('reverse'),
    }),

    // TODO: Check that the reverse spec returns a list.

    withResolvedReverse({
      data: input('data'),
      reverse: '#reverse',
    }).outputs({
      '#resolvedReverse': '#reverseReferenceList',
    }),
  ],
});
