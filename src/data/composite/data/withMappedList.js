// Applies a map function to each item in a list, just like a normal JavaScript
// map.
//
// See also:
//  - withFilteredList
//  - withSortedList
//
// More list utilities:
//  - excludeFromList
//  - fillMissingListItems
//  - withFlattenedList, withUnflattenedList
//  - withPropertyFromList, withPropertiesFromList
//

import {input, templateCompositeFrom} from '#composite';

export default templateCompositeFrom({
  annotation: `withMappedList`,

  inputs: {
    list: input({type: 'array'}),
    map: input({type: 'function'}),
  },

  outputs: ['#mappedList'],

  steps: () => [
    {
      dependencies: [input('list'), input('map')],
      compute: (continuation, {
        [input('list')]: list,
        [input('map')]: mapFn,
      }) => continuation({
        ['#mappedList']:
          list.map(mapFn),
      }),
    },
  ],
});
