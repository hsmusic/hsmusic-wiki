import {input, templateCompositeFrom} from '#composite';

import {exitWithoutDependency} from '#composite/control-flow';

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

    exitWithoutDependency({
      dependency: '#annotationParts',
      value: input.value(false),
    }),

    {
      dependencies: [
        input('part'),
        '#annotationParts',
      ],

      compute: ({
        [input('part')]: search,
        ['#annotationParts']: parts,
      }) =>
        parts.some(part =>
          part.toLowerCase() ===
          search.toLowerCase()),
    },
  ],
});
