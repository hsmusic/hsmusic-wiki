// Check out the info on reverseReferenceList!
// This is its composable form.

import withReverseList_template from './helpers/withReverseList-template.js';

import {input} from '#composite';

import {withMappedList} from '#composite/data';

export default withReverseList_template({
  annotation: `withReverseReferenceList`,

  propertyInputName: 'list',
  outputName: '#reverseReferenceList',

  customCompositionSteps: () => [
    {
      dependencies: [input('list')],
      compute: (continuation, {
        [input('list')]: list,
      }) => continuation({
        ['#referenceMap']:
          thing => thing[list],
      }),
    },

    withMappedList({
      list: input('data'),
      map: '#referenceMap',
    }).outputs({
      '#mappedList': '#referencedThings',
    }),

    {
      dependencies: [input('data')],
      compute: (continuation, {
        [input('data')]: data,
      }) => continuation({
        ['#referencingThings']:
          data,
      }),
    },
  ],
});
