import {input, templateCompositeFrom} from '#composite';
import find from '#find';
import {stitchArrays} from '#sugar';
import {validateReviewPointList} from '#validators';

import {withResolvedReferenceList} from '#composite/wiki-data';

import {
  fillMissingListItems,
  withFlattenedList,
  withPropertiesFromList,
  withUnflattenedList,
} from '#composite/data';

import withResolvedReferenceDiscussions from './withResolvedReferenceDiscussions.js';

export default templateCompositeFrom({
  annotation: `withResolvedReviewPoints`,

  inputs: {
    from: input({
      validate: validateReviewPointList(),
    }),
  },

  outputs: ['#resolvedReviewPoints'],

  steps: () => [
    withPropertiesFromList({
      list: input('from'),
      properties: input.value([
        'field',
        'dateRecorded',
        'notes',
        'referenceDiscussions',
        'referralArtists',
      ]),
    }),

    fillMissingListItems({
      list: '#list.referralArtists',
      fill: input.value([]),
    }),

    fillMissingListItems({
      list: '#list.referenceDiscussions',
      fill: input.value([]),
    }),

    withFlattenedList({
      list: '#list.referralArtists',
    }),

    withResolvedReferenceList({
      list: '#flattenedList',
      data: 'artistData',
      find: input.value(find.artist),
      notFoundMode: input.value('null'),
    }),

    withUnflattenedList({
      list: '#resolvedReferenceList',
    }).outputs({
      ['#unflattenedList']:
        '#list.referralArtists',
    }),

    withFlattenedList({
      list: '#list.referenceDiscussions',
    }),

    withResolvedReferenceDiscussions({
      from: '#flattenedList',
    }),

    withUnflattenedList({
      list: '#resolvedReferenceDiscussions',
    }).outputs({
      ['#unflattenedList']:
        '#list.referenceDiscussions',
    }),

    {
      dependencies: [
        '#list.field',
        '#list.dateRecorded',
        '#list.notes',
        '#list.referenceDiscussions',
        '#list.referralArtists',
      ],

      compute: (continuation, {
        ['#list.field']: field,
        ['#list.dateRecorded']: dateRecorded,
        ['#list.notes']: notes,
        ['#list.referenceDiscussions']: referenceDiscussions,
        ['#list.referralArtists']: referralArtists,
      }) => continuation({
        ['#resolvedReviewPoints']:
          stitchArrays({
            field,
            dateRecorded,
            notes,
            referenceDiscussions,
            referralArtists,
          }),
      }),
    },
  ],
});
