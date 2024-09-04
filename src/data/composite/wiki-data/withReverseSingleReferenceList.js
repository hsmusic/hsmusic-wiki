// Like withReverseReferenceList, but for finding all things which reference
// the current thing by a property that contains a single reference, rather
// than within a reference list.

import withReverseList_template from './helpers/withReverseList-template.js';

import {input} from '#composite';

import {withMappedList} from '#composite/data';

export default withReverseList_template({
  annotation: `withReverseSingleReferenceList`,

  propertyInputName: 'ref',
  outputName: '#reverseSingleReferenceList',

  customCompositionSteps: () => [
    {
      dependencies: [input('data')],
      compute: (continuation, {
        [input('data')]: data,
      }) => continuation({
        ['#referencingThings']:
          data,
      }),
    },

    // This map wraps each referenced thing in a single-item array.
    // Each referencing thing references exactly one thing, if any.
    {
      dependencies: [input('ref')],
      compute: (continuation, {
        [input('ref')]: ref,
      }) => continuation({
        ['#singleReferenceMap']:
          thing =>
            (thing[ref]
              ? [thing[ref]]
              : []),
      }),
    },

    withMappedList({
      list: '#referencingThings',
      map: '#singleReferenceMap',
    }).outputs({
      '#mappedList': '#referencedThings',
    }),
  ],
});
