// Resolves a reference by using the provided find function to match it
// within the provided thingData dependency. This will early exit if the
// data dependency is null, or, if notFoundMode is set to 'exit', if the find
// function doesn't match anything for the reference. Otherwise, the data
// object is provided on the output dependency; or null, if the reference
// doesn't match anything or itself was null to begin with.

import {input, templateCompositeFrom} from '#composite';
import {is} from '#validators';

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

    notFoundMode: input({
      validate: is('null', 'exit'),
      defaultValue: 'null',
    }),
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
        input('notFoundMode'),
      ],

      compute(continuation, {
        [input('ref')]: ref,
        [input('data')]: data,
        [input('find')]: findFunction,
        [input('notFoundMode')]: notFoundMode,
      }) {
        const match = findFunction(ref, data, {mode: 'quiet'});

        if (match === null && notFoundMode === 'exit') {
          return continuation.exit(null);
        }

        return continuation.raiseOutput({
          ['#resolvedReference']: match ?? null,
        });
      },
    },
  ],
});
