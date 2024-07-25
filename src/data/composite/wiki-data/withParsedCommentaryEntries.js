import {input, templateCompositeFrom} from '#composite';
import {stitchArrays} from '#sugar';
import {isCommentary} from '#validators';
import {commentaryRegexCaseSensitive} from '#wiki-data';

import {
  fillMissingListItems,
  withFlattenedList,
  withPropertiesFromList,
  withUnflattenedList,
} from '#composite/data';

import inputSoupyFind from './inputSoupyFind.js';
import withParsedContentEntries from './withParsedContentEntries.js';
import withResolvedReferenceList from './withResolvedReferenceList.js';

export default templateCompositeFrom({
  annotation: `withParsedCommentaryEntries`,

  inputs: {
    from: input({validate: isCommentary}),
  },

  outputs: ['#parsedCommentaryEntries'],

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

    {
      dependencies: ['#entries.annotation'],
      compute: (continuation, {
        ['#entries.annotation']: annotation,
      }) => continuation({
        ['#entries.webArchiveDate']:
          annotation
            .map(text => text?.match(/https?:\/\/web.archive.org\/web\/([0-9]{8,8})[0-9]*\//))
            .map(match => match?.[1])
            .map(dateText =>
              (dateText
                ? dateText.slice(0, 4) + '/' +
                  dateText.slice(4, 6) + '/' +
                  dateText.slice(6, 8)
                : null)),
      }),
    },

    {
      dependencies: ['#entries.date'],
      compute: (continuation, {
        ['#entries.date']: date,
      }) => continuation({
        ['#entries.date']:
          date
            .map(date => date ? new Date(date) : null),
      }),
    },

    {
      dependencies: ['#entries.secondDate'],
      compute: (continuation, {
        ['#entries.secondDate']: secondDate,
      }) => continuation({
        ['#entries.secondDate']:
          secondDate
            .map(date => date ? new Date(date) : null),
      }),
    },

    fillMissingListItems({
      list: '#entries.dateKind',
      fill: input.value(null),
    }),

    {
      dependencies: ['#entries.accessDate', '#entries.webArchiveDate'],
      compute: (continuation, {
        ['#entries.accessDate']: accessDate,
        ['#entries.webArchiveDate']: webArchiveDate,
      }) => continuation({
        ['#entries.accessDate']:
          stitchArrays({accessDate, webArchiveDate})
            .map(({accessDate, webArchiveDate}) =>
              accessDate ??
              webArchiveDate ??
              null)
            .map(date => date ? new Date(date) : date),
      }),
    },

    {
      dependencies: ['#entries.accessKind', '#entries.webArchiveDate'],
      compute: (continuation, {
        ['#entries.accessKind']: accessKind,
        ['#entries.webArchiveDate']: webArchiveDate,
      }) => continuation({
        ['#entries.accessKind']:
          stitchArrays({accessKind, webArchiveDate})
            .map(({accessKind, webArchiveDate}) =>
              accessKind ??
              (webArchiveDate && 'captured') ??
              null),
      }),
    },

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
        ['#parsedCommentaryEntries']:
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
