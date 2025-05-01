import {input, templateCompositeFrom} from '#composite';
import {parseInput} from '#replacer';
import {transposeArrays} from '#sugar';
import {is} from '#validators';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

import {
  withFilteredList,
  withMappedList,
  withPropertyFromList,
  withUnflattenedList,
} from '#composite/data';

function* splitTextNodeAroundCommas(node) {
  let textNode = {
    i: node.i,
    iEnd: null,
    type: 'text',
    data: '',
  };

  let parseFrom = 0;
  for (const match of node.data.matchAll(/, */g)) {
    const {index} = match, [{length}] = match;

    textNode.data += node.data.slice(parseFrom, index);

    if (textNode.data) {
      textNode.iEnd = textNode.i + textNode.data.length;
      yield textNode;
    }

    yield {
      i: node.i + index,
      iEnd: node.i + index + length,
      type: 'comma-separator',
    };

    textNode = {
      i: node.i + index + length,
      iEnd: null,
      type: 'text',
      data: '',
    };

    parseFrom = index + length;
  }

  if (parseFrom !== node.data.length) {
    textNode.data += node.data.slice(parseFrom);
    textNode.iEnd = node.iEnd;
  }

  if (textNode.data) {
    yield textNode;
  }
}

function* splitTextNodesAroundCommas(nodes) {
  for (const node of nodes) {
    if (node.type === 'text' && node.data.includes(',')) {
      yield* splitTextNodeAroundCommas(node);
    } else {
      yield node;
    }
  }
}

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

    // Get the list of nodes including custom comma-separator nodes.

    {
      dependencies: ['annotation'],
      compute: (continuation, {
        ['annotation']: annotation,
      }) => continuation({
        ['#nodes']:
          Array.from(
            splitTextNodesAroundCommas(
              parseInput(annotation))),
      }),
    },

    // Join the nodes into arrays for each range between comma separators,
    // excluding the comma-separator nodes themselves.

    withMappedList({
      list: '#nodes',
      map: input.value(node => node.type === 'comma-separator'),
    }).outputs({
      '#mappedList': '#commaSeparatorFilter',
    }),

    withMappedList({
      list: '#commaSeparatorFilter',
      filter: '#commaSeparatorFilter',
      map: input.value((_node, index) => index),
    }),

    withFilteredList({
      list: '#mappedList',
      filter: '#commaSeparatorFilter',
    }).outputs({
      '#filteredList': '#commaSeparatorIndices',
    }),

    {
      dependencies: ['#nodes', '#commaSeparatorFilter'],

      compute: (continuation, {
        ['#nodes']: nodes,
        ['#commaSeparatorFilter']: commaSeparatorFilter,
      }) => continuation({
        ['#nodes']:
          nodes.map((node, index) =>
            (commaSeparatorFilter[index]
              ? null
              : node)),
      }),
    },

    {
      dependencies: ['#commaSeparatorIndices'],
      compute: (continuation, {
        ['#commaSeparatorIndices']: commaSeparatorIndices,
      }) => continuation({
        ['#unflattenIndices']:
          [0, ...commaSeparatorIndices],
      }),
    },

    withUnflattenedList({
      list: '#nodes',
      indices: '#unflattenIndices',
    }).outputs({
      '#unflattenedList': '#nodeLists',
    }),

    // Raise output now, if we're looking for node lists.

    {
      dependencies: ['#nodeLists', input('mode')],
      compute: (continuation, {
        ['#nodeLists']: nodeLists,
        [input('mode')]: mode,
      }) =>
        (mode === 'nodes'
          ? continuation.raiseOutput({'#annotationParts': nodeLists})
          : continuation()),
    },

    // Get the start of the first node, and the end of the last node,
    // within each list.

    {
      dependencies: ['#nodeLists'],

      compute: (continuation, {
        ['#nodeLists']: nodeLists,
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

    // Slice the content text within the bounds of each node list.

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
