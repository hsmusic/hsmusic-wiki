import {input, templateCompositeFrom} from '#composite';
import find from '#find';
import {stitchArrays} from '#sugar';
import {isReferenceDiscussion, strictArrayOf} from '#validators';

import {withResolvedReferenceList} from '#composite/wiki-data';

import {
  fillMissingListItems,
  withFlattenedList,
  withPropertiesFromList,
  withUnflattenedList,
} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withResolvedReferenceDiscussions`,

  inputs: {
    from: input({
      validate: strictArrayOf(isReferenceDiscussion),
    }),
  },

  outputs: ['#resolvedReferenceDiscussions'],

  steps: () => [
    withPropertiesFromList({
      list: input('from'),
      properties: input.value([
        'url',
        'date',
        'annotation',
        'participatingArtists',
      ]),
    }),

    fillMissingListItems({
      list: '#list.participatingArtists',
      fill: input.value([]),
    }),

    fillMissingListItems({
      list: '#list.annotation',
      fill: input.value(null),
    }),

    withFlattenedList({
      list: '#list.participatingArtists',
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
        '#list.participatingArtists',
    }),

    {
      dependencies: [
        '#list.url',
        '#list.date',
        '#list.annotation',
        '#list.participatingArtists',
      ],

      compute: (continuation, {
        ['#list.url']: url,
        ['#list.date']: date,
        ['#list.annotation']: annotation,
        ['#list.participatingArtists']: participatingArtists,
      }) => continuation({
        ['#resolvedReferenceDiscussions']:
          stitchArrays({
            url,
            date,
            annotation,
            participatingArtists,
          }),
      }),
    },
  ],
});
