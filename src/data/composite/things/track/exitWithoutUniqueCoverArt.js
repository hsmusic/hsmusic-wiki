// Shorthand for checking if the track has unique cover art and exposing a
// fallback value if it isn't.

import {input, templateCompositeFrom} from '#composite';

import {exitWithoutDependency} from '#composite/control-flow';

export default templateCompositeFrom({
  annotation: `exitWithoutUniqueCoverArt`,

  inputs: {
    value: input({defaultValue: null}),
  },

  steps: () => [
    exitWithoutDependency({
      dependency: 'hasUniqueCoverArt',
      mode: input.value('falsy'),
      value: input('value'),
    }),
  ],
});
