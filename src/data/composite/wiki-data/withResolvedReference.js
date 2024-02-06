// Resolves a reference by using the provided find function to match it
// within the provided thingData dependency. This will early exit if the
// data dependency is null. Otherwise, the data object is provided on the
// output dependency, or null, if the reference doesn't match anything or
// itself was null to begin with.

import {input, templateCompositeFrom} from '#composite';

import {
  exitWithoutDependency,
  raiseOutputWithoutDependency,
} from '#composite/control-flow';

import inputWikiData from './inputWikiData.js';

export default templateCompositeFrom({
  annotation: `withResolvedReference`,

  inputs: {
    ref: input({type: 'string', acceptsNull: true}),

    data: inputWikiData({allowMixedTypes: false}),
    find: input({type: 'function'}),
  },

  outputs: ['#resolvedReference'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: input('ref'),
      output: input.value({
        ['#resolvedReference']: null,
      }),
    }),

    exitWithoutDependency({
      dependency: input('data'),
    }),

    {
      dependencies: [
        input('ref'),
        input('data'),
        input('find'),
      ],

      compute: (continuation, {
        [input('ref')]: ref,
        [input('data')]: data,
        [input('find')]: findFunction,
      }) => continuation({
        ['#resolvedReference']:
          findFunction(ref, data, {mode: 'quiet'}) ?? null,
      }),
    },
  ],
});
