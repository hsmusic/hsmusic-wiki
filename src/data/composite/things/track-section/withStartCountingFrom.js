import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withNearbyItemFromList, withPropertyFromObject} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withStartCountingFrom`,

  inputs: {
    from: input({
      type: 'number',
      defaultDependency: '_startCountingFrom',
      acceptsNull: true,
    }),
  },

  outputs: ['#startCountingFrom'],

  steps: () => [
    {
      dependencies: [input('from')],
      compute: (continuation, {
        [input('from')]: from,
      }) =>
        (from === null
          ? continuation()
          : continuation.raiseOutput({'#startCountingFrom': from})),
    },

    raiseOutputWithoutDependency({
      dependency: 'album',
      output: input.value({'#startCountingFrom': 1}),
    }),

    withPropertyFromObject({
      object: 'album',
      property: input.value('trackSections'),
    }),

    withNearbyItemFromList({
      list: '#album.trackSections',
      item: input.myself(),
      offset: input.value(-1),
    }).outputs({
      '#nearbyItem': '#previousTrackSection',
    }),

    raiseOutputWithoutDependency({
      dependency: '#previousTrackSection',
      output: input.value({'#startCountingFrom': 1}),
    }),

    withPropertyFromObject({
      object: '#previousTrackSection',
      property: input.value('continueCountingFrom'),
    }).outputs({
      '#previousTrackSection.continueCountingFrom': '#startCountingFrom',
    }),
  ],
});
