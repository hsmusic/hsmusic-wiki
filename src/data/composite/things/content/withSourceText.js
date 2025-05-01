import {input, templateCompositeFrom} from '#composite';
import {parseInput} from '#replacer';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

import {
  withLengthOfList,
  withMappedList,
  withNearbyItemFromList,
  withPropertyFromObject,
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

      textNode = {
        i: node.i + index + length,
        iEnd: null,
        type: 'text',
        data: '',
      };
    }

    yield {
      i: node.i + index,
      iEnd: node.i + index + length,
      type: 'comma-separator',
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
  annotation: `withSourceText`,

  outputs: ['#sourceText'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: 'annotation',
      output: input.value({'#sourceText': null}),
    }),

    // Get the list of notes including custom comma-separator nodes,
    // and do some basic processing to make details about this list
    // available later.

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

    withLengthOfList({
      list: '#nodes',
    }),

    withMappedList({
      list: '#nodes',
      map: input.value(node => node.type === 'comma-separator'),
    }).outputs({
      '#mappedList': '#commaSeparatorFilter',
    }),

    // Identify the first and last nodes in the range running from
    // the first external link, up til (not including) the following
    // comma separator.

    {
      dependencies: ['#nodes'],
      compute: (continuation, {
        ['#nodes']: nodes,
      }) => continuation({
        ['#firstExternalLink']:
          nodes.find(node => node.type === 'external-link'),
      }),
    },

    raiseOutputWithoutDependency({
      dependency: '#firstExternalLink',
      output: input.value({'#sourceText': null}),
    }),

    withNearbyItemFromList({
      item: '#firstExternalLink',
      list: '#nodes',
      offset: input.value(+1),

      filter: '#commaSeparatorFilter',
    }).outputs({
      '#nearbyItem': '#nextCommaSeparator',
    }),

    {
      dependencies: [
        '#firstExternalLink',
        '#nextCommaSeparator',
        '#nodes',
      ],

      compute: (continuation, {
        ['#firstExternalLink']: firstExternalLink,
        ['#nextCommaSeparator']: nextCommaSeparator,
        ['#nodes']: nodes,
      }) => continuation({
        ['#lastNodeInRange']:
          (nextCommaSeparator
            ? nodes.at(nodes.indexOf(nextCommaSeparator) - 1)
            : nodes.at(-1)),
      }),
    },

    // Extract the content text covered by that range.

    withPropertyFromObject({
      object: '#firstExternalLink',
      property: input.value('i'),
    }),

    withPropertyFromObject({
      object: '#lastNodeInRange',
      property: input.value('iEnd'),
    }),

    {
      dependencies: [
        '#firstExternalLink.i',
        '#lastNodeInRange.iEnd',
        'annotation',
      ],

      compute: (continuation, {
        ['#firstExternalLink.i']: i,
        ['#lastNodeInRange.iEnd']: iEnd,
        ['annotation']: annotation,
      }) => continuation({
        ['#sourceText']:
          annotation.slice(i, iEnd),
      }),
    },
  ],
});
