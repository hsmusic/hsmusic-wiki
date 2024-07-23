import {input, templateCompositeFrom} from '#composite';
import {parseInput} from '#replacer';
import {stitchArrays} from '#sugar';
import {isAdditionalFileList} from '#validators';

// eslint-disable-next-line no-unused-vars
import withParsedContentStringNodes from './withParsedContentStringNodes.js';
// TODO: We can't use this yet!! We need compositional subroutines, or similar,
// to run this step on each commentary entry's body (and other content parts).

import {fillMissingListItems, withMappedList, withPropertiesFromList}
  from '#composite/data';

function XXX_niceParseInput(string) {
  if (string === null) {
    return null;
  }

  return parseInput(string);
}

export default templateCompositeFrom({
  annotation: `withParsedAdditionalFiles`,

  inputs: {
    from: input({validate: isAdditionalFileList}),
  },

  outputs: ['#parsedAdditionalFiles'],

  steps: () => [
    withPropertiesFromList({
      list: input('from'),
      prefix: input.value('#entries'),
      properties: input.value([
        'title',
        'description',
        'files',
      ]),
    }),

    fillMissingListItems({
      list: '#entries.description',
      fill: input.value(null),
    }),

    fillMissingListItems({
      list: '#entries.files',
      fill: input.value([]),
    }),

    withMappedList({
      list: '#entries.description',
      map: input.value(XXX_niceParseInput),
    }).outputs({
      '#mappedList': '#entries.description',
    }),

    {
      dependencies: [
        '#entries.title',
        '#entries.description',
        '#entries.files',
      ],

      compute: (continuation, {
        ['#entries.title']: title,
        ['#entries.description']: description,
        ['#entries.files']: files,
      }) => continuation({
        ['#parsedAdditionalFiles']:
          stitchArrays({
            title,
            description,
            files,
          }),
      }),
    },
  ],
});
