import {input, templateCompositeFrom} from '#composite';

import {withResultOfAvailabilityCheck} from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';

import withContainingTrackSection from './withContainingTrackSection.js';

export default templateCompositeFrom({
  annotation: `withSuffixDirectoryFromAlbum`,

  inputs: {
    flagValue: input({
      defaultDependency: 'suffixDirectoryFromAlbum',
      acceptsNull: true,
    }),
  },

  outputs: ['#suffixDirectoryFromAlbum'],

  steps: () => [
    withResultOfAvailabilityCheck({
      from: 'suffixDirectoryFromAlbum',
    }),

    {
      dependencies: [
        '#availability',
        'suffixDirectoryFromAlbum'
      ],

      compute: (continuation, {
        ['#availability']: availability,
        ['suffixDirectoryFromAlbum']: flagValue,
      }) =>
        (availability
          ? continuation.raiseOutput({['#suffixDirectoryFromAlbum']: flagValue})
          : continuation()),
    },

    withContainingTrackSection(),

    withPropertyFromObject({
      object: '#trackSection',
      property: input.value('suffixTrackDirectories'),
    }).outputs({
      '#trackSection.suffixTrackDirectories': '#suffixDirectoryFromAlbum',
    }),
  ],
});
