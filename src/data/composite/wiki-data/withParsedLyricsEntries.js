import {input, templateCompositeFrom} from '#composite';
import {stitchArrays} from '#sugar';
import {isLyrics} from '#validators';
import {commentaryRegexCaseSensitive, oldStyleLyricsDetectionRegex}
  from '#wiki-data';

import {
  fillMissingListItems,
  withFlattenedList,
  withPropertiesFromList,
  withUnflattenedList,
} from '#composite/data';

import inputSoupyFind from './inputSoupyFind.js';
import processContentEntryDates from './processContentEntryDates.js';
import withParsedContentEntries from './withParsedContentEntries.js';
import withResolvedReferenceList from './withResolvedReferenceList.js';

function constituteLyricsEntry(text) {
  return {
    artists: [],
    artistDisplayText: null,
    annotation: null,
    date: null,
    secondDate: null,
    dateKind: null,
    accessDate: null,
    accessKind: null,
    body: text,
  };
}

export default templateCompositeFrom({
  annotation: `withParsedLyricsEntries`,

  inputs: {
    from: input({validate: isLyrics}),
  },

  outputs: ['#parsedLyricsEntries'],

  steps: () => [
    {
      dependencies: [input('from')],
      compute: (continuation, {
        [input('from')]: lyrics,
      }) =>
        (oldStyleLyricsDetectionRegex.test(lyrics)
          ? continuation()
          : continuation.raiseOutput({
              ['#parsedLyricsEntries']:
                [constituteLyricsEntry(lyrics)],
            })),
    },

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
      find: inputSoupyFind.input('artist'),
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
