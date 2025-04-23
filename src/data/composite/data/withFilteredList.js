// Applies a filter - an array of truthy and falsy values - to the index-
// corresponding items in a list. Items which correspond to a truthy value
// are kept, and the rest are excluded from the output list.
//
// TODO: There should be two outputs - one for the items included according to
// the filter, and one for the items excluded.
//
// See also:
//  - withAvailabilityFilter
//  - withMappedList
//  - withSortedList
//

import {input, templateCompositeFrom} from '#composite';

export default templateCompositeFrom({
  annotation: `withFilteredList`,

  inputs: {
    list: input({type: 'array'}),
    filter: input({type: 'array'}),
  },

  outputs: ['#filteredList'],

  steps: () => [
    {
      dependencies: [input('list'), input('filter')],
      compute: (continuation, {
        [input('list')]: list,
        [input('filter')]: filter,
      }) => continuation({
        '#filteredList':
          list.filter((_item, index) => filter[index]),
      }),
    },
  ],
});
