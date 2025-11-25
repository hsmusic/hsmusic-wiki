import {input, templateCompositeFrom} from '#composite';

import {withResultOfAvailabilityCheck} from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withSuffixDirectoryFromAlbum`,

  inputs: {
    flagValue: input({
      defaultDependency: '_suffixDirectoryFromAlbum',
      acceptsNull: true,
    }),
  },

  outputs: ['#suffixDirectoryFromAlbum'],

  steps: () => [
    withResultOfAvailabilityCheck({
      from: input('flagValue'),
    }),

    {
      dependencies: [
        '#availability',
        input('flagValue'),
      ],

      compute: (continuation, {
        ['#availability']: availability,
        [input('flagValue')]: flagValue,
      }) =>
        (availability
          ? continuation.raiseOutput({['#suffixDirectoryFromAlbum']: flagValue})
          : continuation()),
    },

    withPropertyFromObject({
      object: 'trackSection',
      property: input.value('suffixTrackDirectories'),
    }).outputs({
      '#trackSection.suffixTrackDirectories': '#suffixDirectoryFromAlbum',
    }),
  ],
});
