import {input, templateCompositeFrom} from '#composite';
import find from '#find';
import {stitchArrays} from '#sugar';
import {isCommentary} from '#validators';
import {commentaryRegexCaseSensitive} from '#wiki-data';

import {
  fillMissingListItems,
  withFlattenedList,
  withPropertiesFromList,
  withUnflattenedList,
} from '#composite/data';

import withResolvedReferenceList from './withResolvedReferenceList.js';

export default templateCompositeFrom({
  annotation: `withParsedCommentaryEntries`,

  inputs: {
    from: input({validate: isCommentary}),
  },

  outputs: ['#parsedCommentaryEntries'],

  steps: () => [
    {
      dependencies: [input('from')],

      compute: (continuation, {
        [input('from')]: commentaryText,
      }) => continuation({
        ['#rawMatches']:
          Array.from(commentaryText.matchAll(commentaryRegexCaseSensitive)),
      }),
    },

    withPropertiesFromList({
      list: '#rawMatches',
      properties: input.value([
        '0', // The entire match as a string.
        'groups',
        'index',
      ]),
    }).outputs({
      '#rawMatches.0': '#rawMatches.text',
      '#rawMatches.groups': '#rawMatches.groups',
      '#rawMatches.index': '#rawMatches.startIndex',
    }),

    {
      dependencies: [
        '#rawMatches.text',
        '#rawMatches.startIndex',
      ],

      compute: (continuation, {
        ['#rawMatches.text']: text,
        ['#rawMatches.startIndex']: startIndex,
      }) => continuation({
        ['#rawMatches.endIndex']:
          stitchArrays({text, startIndex})
            .map(({text, startIndex}) => startIndex + text.length),
      }),
    },

    {
      dependencies: [
        input('from'),
        '#rawMatches.startIndex',
        '#rawMatches.endIndex',
      ],

      compute: (continuation, {
        [input('from')]: commentaryText,
        ['#rawMatches.startIndex']: startIndex,
        ['#rawMatches.endIndex']: endIndex,
      }) => continuation({
        ['#entries.body']:
          stitchArrays({startIndex, endIndex})
            .map(({endIndex}, index, stitched) =>
              (index === stitched.length - 1
                ? commentaryText.slice(endIndex)
                : commentaryText.slice(
                    endIndex,
                    stitched[index + 1].startIndex)))
            .map(body => body.trim()),
      }),
    },

    withPropertiesFromList({
      list: '#rawMatches.groups',
      prefix: input.value('#entries'),
      properties: input.value([
        'artistReferences',
        'artistDisplayText',
        'annotation',
        'date',
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
          date.map(date => date ? new Date(date) : null),
      }),
    },

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
        '#entries.accessDate',
        '#entries.accessKind',
        '#entries.body',
      ],

      compute: (continuation, {
        ['#entries.artists']: artists,
        ['#entries.artistDisplayText']: artistDisplayText,
        ['#entries.annotation']: annotation,
        ['#entries.date']: date,
        ['#entries.accessDate']: accessDate,
        ['#entries.accessKind']: accessKind,
        ['#entries.body']: body,
      }) => continuation({
        ['#parsedCommentaryEntries']:
          stitchArrays({
            artists,
            artistDisplayText,
            annotation,
            date,
            accessDate,
            accessKind,
            body,
          }),
      }),
    },
  ],
});
