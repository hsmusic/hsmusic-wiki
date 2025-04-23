// Flips a filter, so that each true item becomes false, and vice versa.
// Overwrites the provided dependency.
//
// See also:
//  - withAvailabilityFilter

import {input, templateCompositeFrom} from '#composite';

export default templateCompositeFrom({
  annotation: `flipFilter`,

  inputs: {
    filter: input({type: 'array'}),
  },

  outputs: ({
    [input.staticDependency('filter')]: filterDependency,
  }) => [filterDependency ?? '#flippedFilter'],

  steps: () => [
    {
      dependencies: [
        input('filter'),
        input.staticDependency('filter'),
      ],

      compute: (continuation, {
        [input('filter')]: filter,
        [input.staticDependency('filter')]: filterDependency,
      }) => continuation({
        [filterDependency ?? '#flippedFilter']:
          filter.map(item => !item),
      }),
    },
  ],
});
