import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

export default templateCompositeFrom({
  annotation: `withWebArchiveDate`,

  outputs: ['#webArchiveDate'],

  steps: () => [
    {
      dependencies: ['sourceURLs'],

      compute: (continuation, {sourceURLs}) =>
        continuation({
          ['#dateText']:
            sourceURLs
              .find(url => url.match(/https?:\/\/web\.archive\.org/))
              ?.match(/\/web\/([0-9]{8,8})[0-9]*\//)
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
