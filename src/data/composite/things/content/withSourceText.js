import {input, templateCompositeFrom} from '#composite';
import {parseInput} from '#replacer';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

import withAnnotationParts from './withAnnotationParts.js';

export default templateCompositeFrom({
  annotation: `withSourceText`,

  outputs: ['#sourceText'],

  steps: () => [
    withAnnotationParts({
      mode: input.value('nodes'),
    }),

    raiseOutputWithoutDependency({
      dependency: '#annotationParts',
      output: input.value({'#sourceText': null}),
    }),

    {
      dependencies: ['#annotationParts'],
      compute: (continuation, {
        ['#annotationParts']: annotationParts,
      }) => continuation({
        ['#firstPartWithExternalLink']:
          annotationParts
            .find(nodes => nodes
              .some(node => node.type === 'external-link')),
      }),
    },

    raiseOutputWithoutDependency({
      dependency: '#firstPartWithExternalLink',
      output: input.value({'#sourceText': null}),
    }),

    {
      dependencies: ['annotation', '#firstPartWithExternalLink'],
      compute: (continuation, {
        ['annotation']: annotation,
        ['#firstPartWithExternalLink']: nodes,
      }) => continuation({
        ['#sourceText']:
          annotation.slice(
            nodes.at(0).i,
            nodes.at(-1).iEnd),
      }),
    },
  ],
});
