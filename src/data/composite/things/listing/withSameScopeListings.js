import {input, templateCompositeFrom} from '#composite';

import {exitWithoutDependency} from '#composite/control-flow';

export default templateCompositeFrom({
  annotation: `withSameScopeListings`,

  inputs: {
    exitValue: input({defaultValue: null}),
  },

  outputs: ['#sameScopeListings'],

  steps: () => [
    exitWithoutDependency({
      dependency: 'listingData',
      mode: input.value('empty'),
      value: input('exitValue'),
    }),

    exitWithoutDependency({
      dependency: 'scope',
      value: input('exitValue'),
    }),

    {
      dependencies: ['listingData', 'scope'],
      compute: (continuation, {
        ['listingData']: listingData,
        ['scope']: scope,
      }) => continuation({
        ['#sameScopeListings']:
          listingData.filter(listing =>
            listing.scope === scope),
      }),
    },
  ],
});
