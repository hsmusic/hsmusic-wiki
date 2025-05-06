import {input, templateCompositeFrom} from '#composite';

import {exposeDependency} from '#composite/control-flow';

import withHasAnnotationPart from './withHasAnnotationPart.js';

export default templateCompositeFrom({
  annotation: `hasAnnotationPart`,

  compose: false,

  inputs: {
    part: input({type: 'string'}),
  },

  steps: () => [
    withHasAnnotationPart({
      part: input('part'),
    }),

    exposeDependency({
      dependency: '#hasAnnotationPart',
    }),
  ],
});
