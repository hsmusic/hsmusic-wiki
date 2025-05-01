import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withFilteredList, withMappedList} from '#composite/data';
import {withContentNodes} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withExpressedOrImplicitArtistReferences`,

  inputs: {
    from: input({type: 'array', acceptsNull: true}),
  },

  outputs: ['#artistReferences'],

  steps: () => [
    {
      dependencies: [input('from')],
      compute: (continuation, {
        [input('from')]: expressedArtistReferences,
      }) =>
        (expressedArtistReferences
          ? continuation.raiseOutput({'#artistReferences': expressedArtistReferences})
          : continuation()),
    },

    raiseOutputWithoutDependency({
      dependency: 'artistText',
      output: input.value({'#artistReferences': null}),
    }),

    withContentNodes({
      from: 'artistText',
    }),

    withMappedList({
      list: '#contentNodes',
      map: input.value(node =>
        node.type === 'tag' &&
        node.data.replacerKey?.data === 'artist'),
    }).outputs({
      '#mappedList': '#artistTagFilter',
    }),

    withFilteredList({
      list: '#contentNodes',
      filter: '#artistTagFilter',
    }).outputs({
      '#filteredList': '#artistTags',
    }),

    withMappedList({
      list: '#artistTags',
      map: input.value(node =>
        node.data.replacerValue[0].data),
    }).outputs({
      '#mappedList': '#artistReferences',
    }),
  ],
});
