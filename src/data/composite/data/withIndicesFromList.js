// Gets all the indices of a list... in a list! The list [foo, bar, baz] has
// the indices [0, 1, 2] - it's a function of the length of the list and not
// the actual contents.

import {input, templateCompositeFrom} from '#composite';
import {isArray} from '#validators';

export default templateCompositeFrom({
  annotation: `withIndicesFromList`,

  inputs: {
    list: input({
      validate: isArray,
    }),
  },

  outputs: ['#indices'],

  steps: () => [
    {
      dependencies: [input('list')],
      compute: (continuation, {
        [input('list')]: list,
      }) => continuation({
        ['#length']:
          list.length,
      }),
    },

    {
      dependencies: ['#length'],
      compute: (continuation, {
        ['#length']: length,
      }) => continuation({
        ['#indices']:
          Array.from({length}, (_, index) => index),
      }),
    },
  ],
});
