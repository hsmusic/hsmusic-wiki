import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withFilteredList, withMappedList} from '#composite/data';
import {withContentNodes} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withExpressedOrImplicitArtistReferences`,

  inputs: {
    fromExpressed: input({type: 'array', acceptsNull: true}),
    fromContent: input({type: 'string', acceptsNull: true}),

    filterArtistTags: input({type: 'function', defaultValue: () => true}),
  },

  outputs: ['#artistReferences'],

  steps: () => [
    {
      dependencies: [input('fromExpressed')],
      compute: (continuation, {
        [input('fromExpressed')]: expressedArtistReferences,
      }) =>
        (expressedArtistReferences
          ? continuation.raiseOutput({'#artistReferences': expressedArtistReferences})
          : continuation()),
    },

    raiseOutputWithoutDependency({
      dependency: input('fromContent'),
      output: input.value({'#artistReferences': []}),
    }),

    withContentNodes({
      from: input('fromContent'),
    }),

    withMappedList({
      list: '#contentNodes',
      map: input.value(node =>
        node.type === 'tag' &&
        node.data.replacerKey?.data === 'artist'),
    }).outputs({
      '#mappedList': '#artistTagFilter',
    }),

    withFilteredList('#contentNodes', '#artistTagFilter')
      .outputs({'#filteredList': '#artistTags'}),

    withMappedList({
      list: '#artistTags',
      map: input('filterArtistTags'),
    }).outputs({
      '#mappedList': '#customFilter',
    }),

    withFilteredList({list: '#artistTags', filter: '#customFilter'})
      .outputs({'#filteredList': '#artistTags'}),

    withMappedList({
      list: '#artistTags',
      map: input.value(node =>
        'artist:' +
        node.data.replacerValue[0].data),
    }).outputs({
      '#mappedList': '#artistReferences',
    }),
  ],
});
