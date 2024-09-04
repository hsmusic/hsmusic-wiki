// Analogous implementation for withReverseReferenceList, for contributions.

import withReverseList_template from './helpers/withReverseList-template.js';

import {input} from '#composite';

import {withFlattenedList, withMappedList} from '#composite/data';

export default withReverseList_template({
  annotation: `withReverseContributionList`,

  propertyInputName: 'list',
  outputName: '#reverseContributionList',

  customCompositionSteps: () => [
    {
      dependencies: [input('list')],
      compute: (continuation, {
        [input('list')]: list,
      }) => continuation({
        ['#contributionListMap']:
          thing => thing[list],
      }),
    },

    withMappedList({
      list: input('data'),
      map: '#contributionListMap',
    }).outputs({
      '#mappedList': '#contributionLists',
    }),

    withFlattenedList({
      list: '#contributionLists',
    }).outputs({
      '#flattenedList': '#referencingThings',
    }),

    withMappedList({
      list: '#referencingThings',
      map: input.value(contrib => [contrib.artist]),
    }).outputs({
      '#mappedList': '#referencedThings',
    }),
  ],
});
