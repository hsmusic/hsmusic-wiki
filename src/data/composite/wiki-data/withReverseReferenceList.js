// Check out the info on reverseReferenceList!
// This is its composable form.

import {input, templateCompositeFrom} from '#composite';

import {exitWithoutDependency} from '#composite/control-flow';

import inputWikiData from './inputWikiData.js';

export default templateCompositeFrom({
  annotation: `withReverseReferenceList`,

  inputs: {
    data: inputWikiData({allowMixedTypes: false}),
    list: input({type: 'string'}),
  },

  outputs: ['#reverseReferenceList'],

  steps: () => [
    exitWithoutDependency({
      dependency: input('data'),
      value: input.value([]),
    }),

    {
      dependencies: [input.myself(), input('data'), input('list')],

      compute: (continuation, {
        [input.myself()]: thisThing,
        [input('data')]: data,
        [input('list')]: refListProperty,
      }) =>
        continuation({
          ['#reverseReferenceList']:
            data.filter(thing => thing[refListProperty].includes(thisThing)),
        }),
    },
  ],
});
