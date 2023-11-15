import {input, templateCompositeFrom} from '#composite';
import find from '#find';
import {stitchArrays} from '#sugar';
import {isCommentary} from '#validators';

import {fillMissingListItems, withPropertiesFromList} from '#composite/data';

import withResolvedReferenceList from './withResolvedReferenceList.js';

// Matches in roughly the format:
//
//    <i>artistReference:</i> (annotation, date)
//
// where capturing group "annotation" can be any text at all, except that the
// last entry (past a comma or the only content within parentheses), if parsed
// as a date, is the capturing group "date". "Parsing as a date" means one of
// these formats:
//
//   * "25 December 2019" - one or two number digits, followed by any text,
//     followed by four number digits
//   * "12/25/2019" - one or two number digits, a slash, one or two number
//     digits, a slash, and two to four number digits
//
// The artist reference can optionally be boldface (in <b></b>), which will be
// captured as non-null in "boldfaceArtist". Otherwise it is all the characters
// between <i> and </i> and is captured in "artistReference" and is either the
// name of an artist or an "artist:directory"-style reference.
//
export const commentaryRegex =
  /^<i>(?<boldfaceArtist><b>)?(?<artistReference>.+):(?:<\/b>)?<\/i>(?: \((?<annotation>(?:.*?(?=[,)]))*?)(?:,? ?(?<date>[0-9]{1,2} [^,]*[0-9]{4,4}|[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}))?\))?/gm;

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
          Array.from(commentaryText.matchAll(commentaryRegex)),
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
        'artistReference',
        'boldfaceArtist',
        'annotation',
        'date',
      ]),
    }),

    // The artistReference group will always have a value, since it's required
    // for the line to match in the first place.

    withResolvedReferenceList({
      list: '#entries.artistReference',
      data: 'artistData',
      find: input.value(find.artist),
      notFoundMode: input.value('null'),
    }).outputs({
      '#resolvedReferenceList': '#entries.artist',
    }),

    {
      dependencies: ['#entries.boldfaceArtist'],
      compute: (continuation, {
        ['#entries.boldfaceArtist']: boldfaceArtist,
      }) => continuation({
        ['#entries.boldfaceArtist']:
          boldfaceArtist.map(boldface => boldface ? true : false),
      }),
    },

    fillMissingListItems({
      list: '#entries.annotation',
      fill: input.value(null),
    }),

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
      dependencies: [
        '#entries.artist',
        '#entries.boldfaceArtist',
        '#entries.annotation',
        '#entries.date',
        '#entries.body',
      ],

      compute: (continuation, {
        ['#entries.artist']: artist,
        ['#entries.boldfaceArtist']: boldfaceArtist,
        ['#entries.annotation']: annotation,
        ['#entries.date']: date,
        ['#entries.body']: body,
      }) => continuation({
        ['#parsedCommentaryEntries']:
          stitchArrays({
            artist,
            boldfaceArtist,
            annotation,
            date,
            body,
          }),
      }),
    },
  ],
});
