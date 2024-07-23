// It's withParsedContentStringNodes, but for a list of content strings.
// Sort of evil! Items in the list that are null are kept as null.

import {input, templateCompositeFrom} from '#composite';
import {parseInput} from '#replacer';
import {isContentString, sparseArrayOf} from '#validators';

// eslint-disable-next-line no-unused-vars
import withParsedContentStringNodes from './withParsedContentStringNodes.js';
// TODO: We can't use this yet!! We need compositional subroutines, or similar,
// to run this step on each commentary entry's body (and other content parts).

import {withMappedList} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withParsedContentStringNodesFromList`,

  inputs: {
    list: input({
      validate: sparseArrayOf(isContentString),
    }),
  },

  outputs: ['#parsedContentStringNodes'],

  steps: () => [
    // TODO: This should be a map based on withParsedContentStringNodes!!
    withMappedList({
      list: input('list'),
      map: input.value(string => {
        if (string === null) {
          return null;
        }

        return parseInput(string);
      }),
    }).outputs({
      '#mappedList': '#parsedContentStringNodes',
    }),
  ],
});
