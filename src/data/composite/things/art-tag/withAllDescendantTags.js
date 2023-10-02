// Gets all the tags which descend from this one - that means its own direct
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
  annotation: `withAllDescendantTags`,

  outputs: ['#allDescendantTags'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: 'directDescendantTags',
      mode: input.value('empty'),
      output: input.value({'#allDescendantTags': []})
    }),

    withResolvedReferenceList({
      list: 'directDescendantTags',
      data: 'artTagData',
      find: input.value(find.artTag),
    }),

    {
      dependencies: ['#resolvedReferenceList'],
      compute: (continuation, {
        ['#resolvedReferenceList']: directDescendantTags,
      }) => continuation({
        ['#allDescendantTags']:
          unique([
            ...directDescendantTags,
            ...directDescendantTags.flatMap(tag => tag.allDescendantTags),
          ]),
      }),
    },
  ],
})
