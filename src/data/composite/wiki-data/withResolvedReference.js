// Resolves a reference by using the provided find function to match it
// within the provided thingData dependency. The data object is provided on
// the output dependency, or null, if the reference doesn't match anything or
// itself was null to begin with.

import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

import gobbleSoupyFind from './gobbleSoupyFind.js';
import inputFindOptions from './inputFindOptions.js';
import inputSoupyFind from './inputSoupyFind.js';
import inputWikiData from './inputWikiData.js';

export default templateCompositeFrom({
  annotation: `withResolvedReference`,

  inputs: {
    ref: input({type: 'string', acceptsNull: true}),

    data: inputWikiData({allowMixedTypes: true}),
    find: inputSoupyFind(),
    findOptions: inputFindOptions(),
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
      dependencies: [input('findOptions')],
      compute: (continuation, {
        [input('findOptions')]: findOptions,
      }) => continuation({
        ['#findOptions']:
          (findOptions
            ? {...findOptions, mode: 'quiet'}
            : {mode: 'quiet'}),
      }),
    },

    {
      dependencies: [
        input('ref'),
        input('data'),
        '#find',
        '#findOptions',
      ],

      compute: (continuation, {
        [input('ref')]: ref,
        [input('data')]: data,
        ['#find']: findFunction,
        ['#findOptions']: findOptions,
      }) => continuation({
        ['#resolvedReference']:
          (data
            ? findFunction(ref, data, findOptions) ?? null
            : findFunction(ref, findOptions) ?? null),
      }),
    },
  ],
});
