// Gets all the art tags which are ancestors of this one as a "baobab tree" -
// what you'd typically think of as roots are all up in the air! Since this
// really is backwards from the way that the art tag tree is written in data,
// chances are pretty good that there will be many of the exact same "leaf"
// nodes - art tags which don't themselves have any ancestors. In the actual
// data structure, each node is a Map, with keys for each ancestor and values
// for each ancestor's own baobab (thus a branching structure, just like normal
// trees in this regard).

import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withReverseReferenceList} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withAncestorArtTagBaobabTree`,

  outputs: ['#ancestorArtTagBaobabTree'],

  steps: () => [
    withReverseReferenceList({
      data: 'artTagData',
      list: input.value('directDescendantArtTags'),
    }).outputs({
      ['#reverseReferenceList']: '#directAncestorArtTags',
    }),

    raiseOutputWithoutDependency({
      dependency: '#directAncestorArtTags',
      mode: input.value('empty'),
      output: input.value({'#ancestorArtTagBaobabTree': {}})
    }),

    {
      dependencies: ['#directAncestorArtTags'],
      compute: (continuation, {
        ['#directAncestorArtTags']: directAncestorArtTags,
      }) => continuation({
        ['#ancestorArtTagBaobabTree']:
          new Map(
            directAncestorArtTags
              .map(artTag => [artTag, artTag.ancestorArtTagBaobabTree])),
      }),
    },
  ],
});
