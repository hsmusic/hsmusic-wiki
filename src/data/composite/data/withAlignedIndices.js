// Like withAlignedList, this "aligns" a list of indices with a list of numeric
// values - typically the #unstableSortIndices resultant from a particular call
// to withSortedList. This function differs from withAlignedList in that the
// values in the source list represents positions in the alignment list. This
// allows for applying multiple calls to withAlignedIndices, aligning the same
// list of indices with the results of various sorts; the order alignment lists
// are used in controls their precedence in the final sort (later alignments
// take greater precedence).

import {input, templateCompositeFrom} from '#composite';
import {isNumber, isWholeNumber, strictArrayOf} from '#validators';

export default templateCompositeFrom({
  annotation: `withAlignedIndices`,

  inputs: {
    indices: input({
      validate: strictArrayOf(isWholeNumber),
    }),

    alignment: input({
      validate: strictArrayOf(isNumber),
    }),
  },

  outputs: ['#alignedIndices'],

  steps: () => [
    {
      dependencies: [input('indices'), input('alignment')],
      compute: (continuation, {
        [input('indices')]: indices,
        [input('alignment')]: alignment,
      }) => continuation({
        ['#alignedIndices']:
          indices.sort((index1, index2) =>
            alignment[index1] - alignment[index2]),
      }),
    },
  ],
})
