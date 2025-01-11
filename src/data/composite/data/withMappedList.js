// Applies a map function to each item in a list, just like a normal JavaScript
// map.
//
// Pass a filter (e.g. from withAvailabilityFilter) to process only items
// kept by the filter. Other items will be left as-is.
//
// See also:
//  - withFilteredList
//  - withSortedList
//

import {input, templateCompositeFrom} from '#composite';
import {stitchArrays} from '#sugar';

export default templateCompositeFrom({
  annotation: `withMappedList`,

  inputs: {
    list: input({type: 'array'}),
    map: input({type: 'function'}),

    filter: input({
      type: 'array',
      defaultValue: null,
    }),
  },

  outputs: ['#mappedList'],

  steps: () => [
    {
      dependencies: [input('list'), input('map'), input('filter')],
      compute: (continuation, {
        [input('list')]: list,
        [input('map')]: mapFn,
        [input('filter')]: filter,
      }) => continuation({
        ['#mappedList']:
          stitchArrays({
            item: list,
            keep: filter ?? Array.from(list, () => true),
          }).map(({item, keep}, index) =>
              (keep
                ? mapFn(item, index, list)
                : item)),
      }),
    },
  ],
});
