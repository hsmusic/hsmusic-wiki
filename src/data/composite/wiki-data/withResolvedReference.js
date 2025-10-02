// Resolves a reference by using the provided find function to match it
// within the provided thingData dependency. The data object is provided on
// the output dependency, or null, if the reference doesn't match anything or
// itself was null to begin with.

import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

import gobbleSoupyFind from './gobbleSoupyFind.js';
import inputSoupyFind from './inputSoupyFind.js';
import inputWikiData from './inputWikiData.js';

export default templateCompositeFrom({
  annotation: `withResolvedReference`,

  inputs: {
    ref: input({type: 'string', acceptsNull: true}),

    data: inputWikiData({allowMixedTypes: true}),
    find: inputSoupyFind(),
  },

  outputs: ['#resolvedReference'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: input('ref'),
      output: input.value({
        ['#resolvedReference']: null,
      }),
    }),

    gobbleSoupyFind({
      find: input('find'),
    }),

    {
      dependencies: [
        input('ref'),
        input('data'),
        '#find',
      ],

      compute: (continuation, {
        [input('ref')]: ref,
        [input('data')]: data,
        ['#find']: findFunction,
      }) => continuation({
        ['#resolvedReference']:
          (data
            ? findFunction(ref, data, {mode: 'quiet'}) ?? null
            : findFunction(ref, {mode: 'quiet'}) ?? null),
      }),
    },
  ],
});
