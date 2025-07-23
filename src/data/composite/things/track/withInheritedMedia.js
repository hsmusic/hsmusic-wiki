import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency, withResultOfAvailabilityCheck}
  from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';

import withContainingTrackSection from './withContainingTrackSection.js';
import withPropertyFromAlbum from './withPropertyFromAlbum.js';

export default templateCompositeFrom({
  annotation: `withInheritedMedia`,

  outputs: ['#inheritedMedia'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: 'inheritMedia',
      mode: input.value('falsy'),
      output: input.value({'#inheritedMedia': []}),
    }),

    withContainingTrackSection(),

    withPropertyFromObject({
      object: '#trackSection',
      property: input.value('trackRepresentedMedia'),
    }),

    withResultOfAvailabilityCheck({
      from: '#trackSection.trackRepresentedMedia',
      mode: input.value('null'),
    }),

    {
      dependencies: [
        '#availability',
        '#trackSection.trackRepresentedMedia',
      ],

      compute: (continuation, {
        ['#availability']: availability,
        ['#trackSection.trackRepresentedMedia']: trackSectionTrackMedia,
      }) =>
        (availability
          ? continuation.raiseOutput({
              '#inheritedMedia': trackSectionTrackMedia,
            })
          : continuation()),
    },

    withPropertyFromAlbum({
      property: input.value('trackRepresentedMedia'),
    }).outputs({
      '#album.trackRepresentedMedia': '#inheritedMedia',
    }),
  ],
});
