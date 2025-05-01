import {input, templateCompositeFrom} from '#composite';
import {splitContentNodesAround} from '#replacer';
import {anyOf, isFunction, validateInstanceOf} from '#validators';

import {withFilteredList, withMappedList, withUnflattenedList}
  from '#composite/data';

export default templateCompositeFrom({
  annotation: `splitContentNodesAround`,

  inputs: {
    nodes: input({type: 'array'}),

    around: input({
      validate:
        anyOf(isFunction, validateInstanceOf(RegExp)),
    }),
  },

  outputs: ['#contentNodeLists'],

  steps: () => [
    {
      dependencies: [input('nodes'), input('around')],

      compute: (continuation, {
        [input('nodes')]: nodes,
        [input('around')]: splitter,
      }) => continuation({
        ['#nodes']:
          Array.from(splitContentNodesAround(nodes, splitter)),
      }),
    },

    withMappedList({
      list: '#nodes',
      map: input.value(node => node.type === 'separator'),
    }).outputs({
      '#mappedList': '#separatorFilter',
    }),

    withMappedList({
      list: '#separatorFilter',
      filter: '#separatorFilter',
      map: input.value((_node, index) => index),
    }),

    withFilteredList({
      list: '#mappedList',
      filter: '#separatorFilter',
    }).outputs({
      '#filteredList': '#separatorIndices',
    }),

    {
      dependencies: ['#nodes', '#separatorFilter'],

      compute: (continuation, {
        ['#nodes']: nodes,
        ['#separatorFilter']: separatorFilter,
      }) => continuation({
        ['#nodes']:
          nodes.map((node, index) =>
            (separatorFilter[index]
              ? null
              : node)),
      }),
    },

    {
      dependencies: ['#separatorIndices'],
      compute: (continuation, {
        ['#separatorIndices']: separatorIndices,
      }) => continuation({
        ['#unflattenIndices']:
          [0, ...separatorIndices],
      }),
    },

    withUnflattenedList({
      list: '#nodes',
      indices: '#unflattenIndices',
    }).outputs({
      '#unflattenedList': '#contentNodeLists',
    }),
  ],
});
