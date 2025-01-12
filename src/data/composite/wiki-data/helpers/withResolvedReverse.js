// Actually execute a reverse function.

import {input, templateCompositeFrom} from '#composite';

import inputWikiData from '../inputWikiData.js';

export default templateCompositeFrom({
  annotation: `withReverseReferenceList`,

  inputs: {
    data: inputWikiData({allowMixedTypes: true}),
    reverse: input({type: 'function'}),
    options: input({type: 'object', defaultValue: null}),
  },

  outputs: ['#resolvedReverse'],

  steps: () => [
    {
      dependencies: [
        input.myself(),
        input('data'),
        input('reverse'),
        input('options'),
      ],

      compute: (continuation, {
        [input.myself()]: myself,
        [input('data')]: data,
        [input('reverse')]: reverseFunction,
        [input('options')]: opts,
      }) => continuation({
        ['#resolvedReverse']:
          (data
            ? reverseFunction(myself, data, opts)
            : reverseFunction(myself, opts)),
      }),
    },
  ],
});
