import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

import withAnnotationParts from './withAnnotationParts.js';

export default templateCompositeFrom({
  annotation: `withHasAnnotationPart`,

  inputs: {
    part: input({type: 'string'}),
  },

  outputs: ['#hasAnnotationPart'],

  steps: () => [
    withAnnotationParts({
      mode: input.value('strings'),
    }),

    raiseOutputWithoutDependency({
      dependency: '#annotationParts',
      output: input.value({'#hasAnnotationPart': false}),
    }),

    {
      dependencies: [
        input('part'),
        '#annotationParts',
      ],

      compute: (continuation, {
        [input('part')]: search,
        ['#annotationParts']: parts,
      }) => continuation({
        ['#hasAnnotationPart']:
          parts.some(part =>
            part.toLowerCase() ===
            search.toLowerCase()),
      }),
    },
  ],
});
