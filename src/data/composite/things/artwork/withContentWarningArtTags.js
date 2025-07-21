import {input, templateCompositeFrom} from '#composite';

import {withFilteredList, withPropertyFromList} from '#composite/data';

import withArtTags from './withArtTags.js';

export default templateCompositeFrom({
  annotation: `withContentWarningArtTags`,

  outputs: ['#contentWarningArtTags'],

  steps: () => [
    withArtTags(),

    withPropertyFromList({
      list: '#artTags',
      property: input.value('isContentWarning'),
    }),

    withFilteredList({
      list: '#artTags',
      filter: '#artTags.isContentWarning',
    }).outputs({
      '#filteredList': '#contentWarningArtTags',
    }),
  ],
});
