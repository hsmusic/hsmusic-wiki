// Gets the index of the provided item in the provided list. Note that this
// will output -1 if the item is not found, and this may be detected using
// any availability check with type: 'index'. If the list includes the item
// twice, the output index will be of the first match.
//
// Both the list and item must be provided.
//
// See also:
//  - withNearbyItemFromList
//  - exitWithoutDependency
//  - raiseOutputWithoutDependency
//

import {input, templateCompositeFrom} from '#composite';

export default templateCompositeFrom({
  annotation: `withIndexInList`,

  inputs: {
    list: input({acceptsNull: false, type: 'array'}),
    item: input({acceptsNull: false}),
  },

  outputs: ['#index'],

  steps: () => [
    {
      dependencies: [input('list'), input('item')],
      compute: (continuation, {
        [input('list')]: list,
        [input('item')]: item,
      }) => continuation({
        ['#index']:
          list.indexOf(item),
      }),
    },
  ],
});
