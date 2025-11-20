import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withIndexInList, withPropertiesFromObject} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withTrackNumber`,

  outputs: ['#trackNumber'],

  steps: () => [
    // Zero is the fallback, not one, but in most albums the first track
    // (and its intended output by this composition) will be one.
    raiseOutputWithoutDependency({
      dependency: 'trackSection',
      output: input.value({'#trackNumber': 0}),
    }),

    withPropertiesFromObject({
      object: 'trackSection',
      properties: input.value(['tracks', 'startCountingFrom']),
    }),

    withIndexInList({
      list: '#trackSection.tracks',
      item: input.myself(),
    }),

    raiseOutputWithoutDependency({
      dependency: '#index',
      output: input.value({'#trackNumber': 0}),
    }),

    {
      dependencies: ['#trackSection.startCountingFrom', '#index'],
      compute: (continuation, {
        ['#trackSection.startCountingFrom']: startCountingFrom,
        ['#index']: index,
      }) => continuation({
        ['#trackNumber']:
          startCountingFrom +
          index,
      }),
    },
  ],
});
