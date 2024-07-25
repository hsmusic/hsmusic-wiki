import {input, templateCompositeFrom} from '#composite';
import {stitchArrays} from '#sugar';
import {isContentString, validateInstanceOf} from '#validators';

import {withPropertiesFromList} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withParsedContentEntries`,

  inputs: {
    // TODO: Is there any way to validate this input based on the *other*
    // inputs proivded, i.e. regexes? This kind of just assumes the string
    // has already been validated according to the form the regex expects,
    // which *is* always the case (as used), but it seems a bit awkward.
    from: input({validate: isContentString}),

    caseSensitiveRegex: input({
      validate: validateInstanceOf(RegExp),
    }),
  },

  outputs: [
    '#parsedContentEntryHeadings',
    '#parsedContentEntryBodies',
  ],

  steps: () => [
    {
      dependencies: [
        input('from'),
        input('caseSensitiveRegex'),
      ],

      compute: (continuation, {
        [input('from')]: commentaryText,
        [input('caseSensitiveRegex')]: caseSensitiveRegex,
      }) => continuation({
        ['#rawMatches']:
          Array.from(commentaryText.matchAll(caseSensitiveRegex)),
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
      '#rawMatches.groups': '#parsedContentEntryHeadings',
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
        ['#parsedContentEntryBodies']:
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

    {
      dependencies: [
        '#parsedContentEntryHeadings',
        '#parsedContentEntryBodies',
      ],

      compute: (continuation, {
        ['#parsedContentEntryHeadings']: parsedContentEntryHeadings,
        ['#parsedContentEntryBodies']: parsedContentEntryBodies,
      }) => continuation({
        ['#parsedContentEntryHeadings']: parsedContentEntryHeadings,
        ['#parsedContentEntryBodies']: parsedContentEntryBodies,
      })
    }
  ],
});
