import {input, templateCompositeFrom} from '#composite';

import {exitWithoutDependency} from '#composite/control-flow';

export default templateCompositeFrom({
  annotation: `hasAnnotationFront`,

  inputs: {
    front: input({type: 'string'}),
  },

  compose: false,

  steps: () => [
    exitWithoutDependency({
      dependency: 'annotationFront',
      value: input.value(false),
    }),

    {
      dependencies: ['annotationFront', input('front')],
      compute: ({
        ['annotationFront']: present,
        [input('front')]: expected,
      }) =>
        present === expected,
    },
  ],
});
