// Like withReverseReferenceList, but this is specifically for special "unique"
// references, meaning this thing is referenced by exactly one or zero things
// in the data list.

import {input, templateCompositeFrom} from '#composite';

import {exitWithoutDependency, raiseOutputWithoutDependency}
  from '#composite/control-flow';

import inputWikiData from './inputWikiData.js';
import withReverseReferenceList from './withReverseReferenceList.js';

export default templateCompositeFrom({
  annotation: `withUniqueReferencingThing`,

  inputs: {
    data: inputWikiData({allowMixedTypes: false}),
    list: input({type: 'string'}),
  },

  outputs: ['#uniqueReferencingThing'],

  steps: () => [
    // Early exit with null (not an empty array) if the data list
    // isn't available.
    exitWithoutDependency({
      dependency: input('data'),
    }),

    withReverseReferenceList({
      data: input('data'),
      list: input('list'),
    }),

    raiseOutputWithoutDependency({
      dependency: '#reverseReferenceList',
      mode: input.value('empty'),
      output: input.value({'#uniqueReferencingThing': null}),
    }),

    {
      dependencies: ['#reverseReferenceList'],
      compute: (continuation, {
        ['#reverseReferenceList']: reverseReferenceList,
      }) => continuation({
        ['#uniqueReferencingThing']:
          reverseReferenceList[0],
      }),
    },
  ],
});
