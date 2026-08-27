import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {constituteFrom} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `inheritFromMainArtwork`,

  steps: () => [
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
