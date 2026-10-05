import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency, withResultOfAvailabilityCheck}
  from '#composite/control-flow';
import {constituteFrom} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `inheritFromMainArtwork`,

  inputs: {
    unlessProvided: input({type: 'boolean', defaultValue: false}),
  },

  steps: () => [
    withResultOfAvailabilityCheck({
      from: input.updateValue(),
    }),

    {
      dependencies: ['#availability', input('unlessProvided')],
      compute: (continuation, {
        ['#availability']: availability,
        [input('unlessProvided')]: unlessProvided,
      }) =>
        (availability && unlessProvided
          ? continuation.raiseOutput()
          : continuation()),
    },

    raiseOutputWithoutDependency({
      dependency: 'isReusedArtwork',
      mode: input.value('falsy'),
    }),

    constituteFrom({
      object: 'mainArtwork',
      property: input.thisProperty(),
    }),
  ],
});
