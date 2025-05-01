import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

export default templateCompositeFrom({
  annotation: `withWebArchiveDate`,

  outputs: ['#webArchiveDate'],

  steps: () => [
    {
      dependencies: ['annotation'],

      compute: (continuation, {annotation}) =>
        continuation({
          ['#dateText']:
            annotation
              ?.match(/https?:\/\/web.archive.org\/web\/([0-9]{8,8})[0-9]*\//)
              ?.[1] ??
            null,
        }),
    },

    raiseOutputWithoutDependency({
      dependency: '#dateText',
      output: input.value({['#webArchiveDate']: null}),
    }),

    {
      dependencies: ['#dateText'],
      compute: (continuation, {['#dateText']: dateText}) =>
        continuation({
          ['#webArchiveDate']:
            new Date(
              dateText.slice(0, 4) + '/' +
              dateText.slice(4, 6) + '/' +
              dateText.slice(6, 8)),
        }),
    },
  ],
});
