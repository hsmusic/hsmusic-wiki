import {input, templateCompositeFrom} from '#composite';

import withStartCountingFrom from './withStartCountingFrom.js';

export default templateCompositeFrom({
  annotation: `withContinueCountingFrom`,

  outputs: ['#continueCountingFrom'],

  steps: () => [
    withStartCountingFrom(),

    {
      dependencies: ['#startCountingFrom', 'tracks'],
      compute: (continuation, {
        ['#startCountingFrom']: startCountingFrom,
        ['tracks']: tracks,
      }) => continuation({
        ['#continueCountingFrom']:
          startCountingFrom +
          tracks.length,
      }),
    },
  ],
});
