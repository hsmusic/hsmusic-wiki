import {input, templateCompositeFrom} from '#composite';

import {exposeWhetherDependencyAvailable} from '#composite/control-flow';

import withAnnotationParts from './withAnnotationParts.js';

export default templateCompositeFrom({
  annotation: `hasAnnotationPart`,

  compose: false,

  inputs: {
    part: input({type: 'string'}),
  },

  steps: () => [
    withAnnotationParts({
      mode: input.value('strings'),
    }),

    withIndexInList({
      item: input('part'),
      list: '#annotationParts',
    }),

    exposeWhetherDependencyAvailable({
      dependency: '#index',
      mode: input.value('index'),
    }),
  ],
});
