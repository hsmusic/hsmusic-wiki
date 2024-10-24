// Gets all the art tags which descend from this one - that means its own direct
// descendants, but also all the direct and indirect desceands of each of those!
// The results aren't specially sorted, but they won't contain any duplicates
// (for example if two descendant tags both route deeper to end up including
// some of the same tags).

import {input, templateCompositeFrom} from '#composite';
import find from '#find';
import {unique} from '#sugar';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withResolvedReferenceList} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withAllDescendantArtTags`,

  outputs: ['#allDescendantArtTags'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: 'directDescendantArtTags',
      mode: input.value('empty'),
      output: input.value({'#allDescendantArtTags': []})
    }),

    withResolvedReferenceList({
      list: 'directDescendantArtTags',
      data: 'artTagData',
      find: input.value(find.artTag),
    }),

    {
      dependencies: ['#resolvedReferenceList'],
      compute: (continuation, {
        ['#resolvedReferenceList']: directDescendantArtTags,
      }) => continuation({
        ['#allDescendantArtTags']:
          unique([
            ...directDescendantArtTags,
            ...directDescendantArtTags.flatMap(artTag => artTag.allDescendantArtTags),
          ]),
      }),
    },
  ],
})
