// Analogous implementation for withReverseReferenceList, for contributions.

import withReverseList_template from './helpers/withReverseList-template.js';

import {input} from '#composite';

import {withFlattenedList, withMappedList, withPropertyFromList}
  from '#composite/data';

export default withReverseList_template({
  annotation: `withReverseContributionList`,

  propertyInputName: 'list',
  outputName: '#reverseContributionList',

  customCompositionSteps: () => [
    withPropertyFromList({
      list: input('data'),
      property: input('list'),
    }).outputs({
      '#values': '#contributionLists',
    }),

    withFlattenedList({
      list: '#contributionLists',
    }).outputs({
      '#flattenedList': '#referencingThings',
    }),

    withPropertyFromList({
      list: '#referencingThings',
      property: input.value('artist'),
    }),

    withMappedList({
      list: '#referencingThings.artist',
      map: input.value(artist => [artist]),
    }).outputs({
      '#mappedList': '#referencedThings',
    }),
  ],
});
