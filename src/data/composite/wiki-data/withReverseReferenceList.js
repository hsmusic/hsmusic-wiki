// Check out the info on reverseReferenceList!
// This is its composable form.

import withReverseList_template from './helpers/withReverseList-template.js';

import {input} from '#composite';

import {withPropertyFromList} from '#composite/data';

export default withReverseList_template({
  annotation: `withReverseReferenceList`,

  propertyInputName: 'list',
  outputName: '#reverseReferenceList',

  customCompositionSteps: () => [
    withPropertyFromList({
      list: input('data'),
      property: input('list'),
    }).outputs({
      '#values': '#referencedThings',
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
