import {input, templateCompositeFrom} from '#composite';

import {withPropertyFromObject} from '#composite/data';

import inputSoupyReverse, {getSoupyReverseInputKey} from './inputSoupyReverse.js';

export default templateCompositeFrom({
  annotation: `gobbleSoupyReverse`,

  inputs: {
    reverse: inputSoupyReverse(),
  },

  outputs: ['#reverse'],

  steps: () => [
    {
      dependencies: [input('reverse')],
      compute: (continuation, {
        [input('reverse')]: reverse,
      }) =>
        (typeof reverse === 'function'
          ? continuation.raiseOutput({
              ['#reverse']: reverse,
            })
          : continuation({
              ['#key']:
                getSoupyReverseInputKey(reverse),
            })),
    },

    withPropertyFromObject({
      object: '_reverse',
      property: '#key',
    }).outputs({
      '#value': '#reverse',
    }),
  ],
});
