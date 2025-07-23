import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

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

    withPropertyFromAlbum({
      property: input.value('trackRepresentedMedia'),
    }).outputs({
      '#album.trackRepresentedMedia': '#inheritedMedia',
    }),
  ],
});
