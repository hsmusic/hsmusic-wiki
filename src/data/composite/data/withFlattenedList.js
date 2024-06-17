// Flattens an array with one level of nested arrays, providing as dependencies
// both the flattened array as well as the original starting indices of each
// successive source array.
//
// See also:
//  - withUnflattenedList
//

import {input, templateCompositeFrom} from '#composite';

export default templateCompositeFrom({
  annotation: `withFlattenedList`,

  inputs: {
    list: input({type: 'array'}),
  },

  outputs: ['#flattenedList', '#flattenedIndices'],

  steps: () => [
    {
      dependencies: [input('list')],
      compute(continuation, {
        [input('list')]: sourceList,
      }) {
        const flattenedList = sourceList.flat();
        const indices = [];
        let lastEndIndex = 0;
        for (const {length} of sourceList) {
          indices.push(lastEndIndex);
          lastEndIndex += length;
        }

        return continuation({
          ['#flattenedList']: flattenedList,
          ['#flattenedIndices']: indices,
        });
      },
    },
  ],
});
