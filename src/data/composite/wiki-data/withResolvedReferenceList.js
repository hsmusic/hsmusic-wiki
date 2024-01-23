// Resolves a list of references, with each reference matched with provided
// data in the same way as withResolvedReference. This will early exit if the
// data dependency is null (even if the reference list is empty). By default
// it will filter out references which don't match, but this can be changed
// to early exit ({notFoundMode: 'exit'}) or leave null in place ('null').
//
// Reference code for:
//  - (atomic) referenceList
//

import {input, templateCompositeFrom} from '#composite';
import {is, isString, validateArrayItems} from '#validators';

import {
  exitWithoutDependency,
  raiseOutputWithoutDependency,
} from '#composite/control-flow';

import inputWikiData from './inputWikiData.js';

export default templateCompositeFrom({
  annotation: `withResolvedReferenceList`,

  inputs: {
    list: input({
      validate: validateArrayItems(isString),
      acceptsNull: true,
    }),

    data: inputWikiData({allowMixedTypes: false}),
    find: input({type: 'function'}),

    notFoundMode: input({
      validate: is('exit', 'filter', 'null'),
      defaultValue: 'filter',
    }),
  },

  outputs: ['#resolvedReferenceList'],

  steps: () => [
    exitWithoutDependency({
      dependency: input('data'),
      value: input.value([]),
    }),

    raiseOutputWithoutDependency({
      dependency: input('list'),
      mode: input.value('empty'),
      output: input.value({
        ['#resolvedReferenceList']: [],
      }),
    }),

    {
      dependencies: [input('list'), input('data'), input('find')],
      compute: (continuation, {
        [input('list')]: list,
        [input('data')]: data,
        [input('find')]: findFunction,
      }) =>
        continuation({
          '#matches': list.map(ref => findFunction(ref, data, {mode: 'quiet'})),
        }),
    },

    {
      dependencies: ['#matches'],
      compute: (continuation, {'#matches': matches}) =>
        (matches.every(match => match)
          ? continuation.raiseOutput({
              ['#resolvedReferenceList']: matches,
            })
          : continuation()),
    },

    {
      dependencies: ['#matches', input('notFoundMode')],
      compute(continuation, {
        ['#matches']: matches,
        [input('notFoundMode')]: notFoundMode,
      }) {
        switch (notFoundMode) {
          case 'exit':
            return continuation.exit([]);

          case 'filter':
            return continuation.raiseOutput({
              ['#resolvedReferenceList']:
                matches.filter(match => match),
            });

          case 'null':
            return continuation.raiseOutput({
              ['#resolvedReferenceList']:
                matches.map(match => match ?? null),
            });

          default:
            throw new TypeError(`Expected notFoundMode to be exit, filter, or null`);
        }
      },
    },
  ],
});
