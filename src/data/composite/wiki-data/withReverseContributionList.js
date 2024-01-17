// Analogous implementation for withReverseReferenceList, but contributions.
//
// This implementation uses a global cache (via WeakMap) to attempt to speed
// up subsequent similar accesses. Reverse contribution lists are the most
// costly in live-dev-server, but we intend to expand the impelemntation here
// to reverse reference lists in general later on.

import {input, templateCompositeFrom} from '#composite';

import {exitWithoutDependency} from '#composite/control-flow';

import inputWikiData from './inputWikiData.js';

export default templateCompositeFrom({
  annotation: `withReverseContributionList`,

  inputs: {
    data: inputWikiData({allowMixedTypes: false}),
    list: input({type: 'string'}),
  },

  outputs: ['#reverseContributionList'],

  steps: () => [
    exitWithoutDependency({
      dependency: input('data'),
      value: input.value([]),
      mode: input.value('empty'),
    }),

    {
      dependencies: [input.myself(), input('data'), input('list')],

      compute: (continuation, {
        [input.myself()]: myself,
        [input('data')]: data,
        [input('list')]: list,
      }) =>
        continuation({
          ['#reverseContributionList']:
            data.filter(thing => thing[list].some(({who}) => who === myself)),
        }),
    },
  ],
});
