import {input, templateCompositeFrom} from '#composite';

import {withPropertyFromObject} from '#composite/data';

import inputSoupyFind, {getSoupyFindInputKey} from './inputSoupyFind.js';

export default templateCompositeFrom({
  annotation: `gobbleSoupyFind`,

  inputs: {
    find: inputSoupyFind(),
  },

  outputs: ['#find'],

  steps: () => [
    {
      dependencies: [input('find')],
      compute: (continuation, {
        [input('find')]: find,
      }) =>
        (typeof find === 'function'
          ? continuation.raiseOutput({
              ['#find']: find,
            })
          : continuation({
              ['#key']:
                getSoupyFindInputKey(find),
            })),
    },

    withPropertyFromObject({
      object: '_find',
      property: '#key',
    }).outputs({
      '#value': '#find',
    }),
  ],
});
