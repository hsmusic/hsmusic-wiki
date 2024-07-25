import {input, templateCompositeFrom} from '#composite';
import find from '#find';
import {stitchArrays} from '#sugar';
import {isLyrics} from '#validators';
import {commentaryRegexCaseSensitive} from '#wiki-data';

import {
  fillMissingListItems,
  withFlattenedList,
  withPropertiesFromList,
  withUnflattenedList,
} from '#composite/data';

import processContentEntryDates from './processContentEntryDates.js';
import withParsedContentEntries from './withParsedContentEntries.js';
import withResolvedReferenceList from './withResolvedReferenceList.js';

export default templateCompositeFrom({
  annotation: `withParsedLyricsEntries`,

  inputs: {
    from: input({validate: isLyrics}),
  },

  outputs: ['#parsedLyricsEntries'],

  steps: () => [
    withParsedContentEntries({
      from: input('from'),
      caseSensitiveRegex: input.value(commentaryRegexCaseSensitive),
    }),

    withPropertiesFromList({
      list: '#parsedContentEntryHeadings',
      prefix: input.value('#entries'),
      properties: input.value([
        'artistReferences',
        'artistDisplayText',
        'annotation',
        'date',
        'secondDate',
        'dateKind',
        'accessDate',
        'accessKind',
      ]),
    }),

    // The artistReferences group will always have a value, since it's required
    // for the line to match in the first place.

    {
      dependencies: ['#entries.artistReferences'],
      compute: (continuation, {
        ['#entries.artistReferences']: artistReferenceTexts,
      }) => continuation({
        ['#entries.artistReferences']:
          artistReferenceTexts
            .map(text => text.split(',').map(ref => ref.trim())),
      }),
    },

    withFlattenedList({
      list: '#entries.artistReferences',
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
      '#unflattenedList': '#entries.artists',
    }),

    fillMissingListItems({
      list: '#entries.artistDisplayText',
      fill: input.value(null),
    }),

    fillMissingListItems({
      list: '#entries.annotation',
      fill: input.value(null),
    }),

    processContentEntryDates(),

    {
      dependencies: [
        '#entries.artists',
        '#entries.artistDisplayText',
        '#entries.annotation',
        '#entries.date',
        '#entries.secondDate',
        '#entries.dateKind',
        '#entries.accessDate',
        '#entries.accessKind',
        '#parsedContentEntryBodies',
      ],

      compute: (continuation, {
        ['#entries.artists']: artists,
        ['#entries.artistDisplayText']: artistDisplayText,
        ['#entries.annotation']: annotation,
        ['#entries.date']: date,
        ['#entries.secondDate']: secondDate,
        ['#entries.dateKind']: dateKind,
        ['#entries.accessDate']: accessDate,
        ['#entries.accessKind']: accessKind,
        ['#parsedContentEntryBodies']: body,
      }) => continuation({
        ['#parsedLyricsEntries']:
          stitchArrays({
            artists,
            artistDisplayText,
            annotation,
            date,
            secondDate,
            dateKind,
            accessDate,
            accessKind,
            body,
          }),
      }),
    },
  ],
});
