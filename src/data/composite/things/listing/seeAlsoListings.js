import {input, templateCompositeFrom} from '#composite';
import {isListingDirectory, looseArrayOf} from '#validators';

import {exitWithoutDependency, exitWithoutUpdateValue}
  from '#composite/control-flow';

import withSameScopeListings from './withSameScopeListings.js';

export default templateCompositeFrom({
  annotation: `seeAlsoListings`,

  compose: false,

  update: {
    validate: looseArrayOf(isListingDirectory),
  },

  steps: () => [
    exitWithoutUpdateValue({
      mode: input.value('empty'),
      value: input.value([]),
    }),

    withSameScopeListings({
      exitValue: input.value([]),
    }),

    {
      dependencies: [
        '#sameScopeListings',
        input.updateValue(),
      ],

      compute: ({
        ['#sameScopeListings']: sameScopeListings,
        [input.updateValue()]: directories,
      }) =>
        directories
          .map(directory =>
            sameScopeListings
              .find(listing => listing.directory === directory))
          .filter(Boolean),
    },
  ],
});
