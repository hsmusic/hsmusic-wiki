// Filters particular values out of a list. Note that this will always
// completely skip over null, but can be used to filter out any other
// primitive or object value.
//
// See also:
//  - fillMissingListItems
//

import {input, templateCompositeFrom} from '#composite';
import {empty} from '#sugar';

export default templateCompositeFrom({
  annotation: `excludeFromList`,

  inputs: {
    list: input(),

    item: input({defaultValue: null}),
    items: input({type: 'array', defaultValue: null}),
  },

  outputs: ({
    [input.staticDependency('list')]: list,
  }) => [list ?? '#list'],

  steps: () => [
    {
      dependencies: [
        input.staticDependency('list'),
        input('list'),
        input('item'),
        input('items'),
      ],

      compute: (continuation, {
        [input.staticDependency('list')]: listName,
        [input('list')]: listContents,
        [input('item')]: excludeItem,
        [input('items')]: excludeItems,
      }) => continuation({
        [listName ?? '#list']:
          listContents.filter(item => {
            if (excludeItem !== null && item === excludeItem) return false;
            if (!empty(excludeItems) && excludeItems.includes(item)) return false;
            return true;
          }),
      }),
    },
  ],
});
