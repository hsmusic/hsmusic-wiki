import {input, templateCompositeFrom} from '#composite';
import {parseContentNodes} from '#replacer';
import {transposeArrays} from '#sugar';
import {is} from '#validators';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withPropertyFromList} from '#composite/data';
import {splitContentNodesAround, withContentNodes} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withAnnotationParts`,

  inputs: {
    mode: input({
      validate: is('strings', 'nodes'),
    }),
  },

  outputs: ['#annotationParts'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: 'annotation',
      output: input.value({'#annotationParts': []}),
    }),

    withContentNodes({
      from: 'annotation',
    }),

    splitContentNodesAround({
      nodes: '#contentNodes',
      around: input.value(/, */g),
    }),

    {
      dependencies: ['#contentNodeLists', input('mode')],
      compute: (continuation, {
        ['#contentNodeLists']: nodeLists,
        [input('mode')]: mode,
      }) =>
        (mode === 'nodes'
          ? continuation.raiseOutput({'#annotationParts': nodeLists})
          : continuation()),
    },

    {
      dependencies: ['#contentNodeLists'],

      compute: (continuation, {
        ['#contentNodeLists']: nodeLists,
      }) => continuation({
        ['#firstNodes']:
          nodeLists.map(list => list.at(0)),

        ['#lastNodes']:
          nodeLists.map(list => list.at(-1)),
      }),
    },

    withPropertyFromList({
      list: '#firstNodes',
      property: input.value('i'),
    }).outputs({
      '#firstNodes.i': '#startIndices',
    }),

    withPropertyFromList({
      list: '#lastNodes',
      property: input.value('iEnd'),
    }).outputs({
      '#lastNodes.iEnd': '#endIndices',
    }),

    {
      dependencies: [
        'annotation',
        '#startIndices',
        '#endIndices',
      ],

      compute: (continuation, {
        ['annotation']: annotation,
        ['#startIndices']: startIndices,
        ['#endIndices']: endIndices,
      }) => continuation({
        ['#annotationParts']:
          transposeArrays([startIndices, endIndices])
            .map(([start, end]) =>
              annotation.slice(start, end)),
      }),
    },
  ],
});
