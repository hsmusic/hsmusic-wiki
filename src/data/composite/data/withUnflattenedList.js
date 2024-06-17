// After mapping the contents of a flattened array in-place (being careful to
// retain the original indices by replacing unmatched results with null instead
// of filtering them out), this function allows for recombining them. It will
// filter out null and undefined items by default (pass {filter: false} to
// disable this).
//
// See also:
//  - withFlattenedList
//

import {input, templateCompositeFrom} from '#composite';
import {isWholeNumber, validateArrayItems} from '#validators';

export default templateCompositeFrom({
  annotation: `withUnflattenedList`,

  inputs: {
    list: input({
      type: 'array',
      defaultDependency: '#flattenedList',
    }),

    indices: input({
      validate: validateArrayItems(isWholeNumber),
      defaultDependency: '#flattenedIndices',
    }),

    filter: input({
      type: 'boolean',
      defaultValue: true,
    }),
  },

  outputs: ['#unflattenedList'],

  steps: () => [
    {
      dependencies: [input('list'), input('indices'), input('filter')],
      compute(continuation, {
        [input('list')]: list,
        [input('indices')]: indices,
        [input('filter')]: filter,
      }) {
        const unflattenedList = [];

        for (let i = 0; i < indices.length; i++) {
          const startIndex = indices[i];
          const endIndex =
            (i === indices.length - 1
              ? list.length
              : indices[i + 1]);

          const values = list.slice(startIndex, endIndex);
          unflattenedList.push(
            (filter
              ? values.filter(value => value !== null && value !== undefined)
              : values));
        }

        return continuation({
          ['#unflattenedList']: unflattenedList,
        });
      },
    },
  ],
});
