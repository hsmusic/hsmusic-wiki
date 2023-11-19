// Excludes duplicate items from a list and provides the results, overwriting
// the list in-place, if possible.

import {input, templateCompositeFrom} from '#composite';
import {unique} from '#sugar';

export default templateCompositeFrom({
  annotation: `withUniqueItemsOnly`,

  inputs: {
    list: input({type: 'array'}),
  },

  outputs: ({
    [input.staticDependency('list')]: list,
  }) => [list ?? '#uniqueItems'],

  steps: () => [
    {
      dependencies: [input('list')],
      compute: (continuation, {
        [input('list')]: list,
      }) => continuation({
        ['#values']:
          unique(list),
      }),
    },

    {
      dependencies: ['#values', input.staticDependency('list')],
      compute: (continuation, {
        '#values': values,
        [input.staticDependency('list')]: list,
      }) => continuation({
        [list ?? '#uniqueItems']:
          values,
      }),
    },
  ],
});
