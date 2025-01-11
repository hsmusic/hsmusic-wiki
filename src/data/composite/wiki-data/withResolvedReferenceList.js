// Resolves a list of references, with each reference matched with provided
// data in the same way as withResolvedReference. This will early exit if the
// data dependency is null (even if the reference list is empty). By default
// it will filter out references which don't match, but this can be changed
// to early exit ({notFoundMode: 'exit'}) or leave null in place ('null').

import {input, templateCompositeFrom} from '#composite';
import {isString, validateArrayItems} from '#validators';

import {withMappedList} from '#composite/data';

import {
  exitWithoutDependency,
  raiseOutputWithoutDependency,
  withAvailabilityFilter,
} from '#composite/control-flow';

import inputNotFoundMode from './inputNotFoundMode.js';
import inputWikiData from './inputWikiData.js';
import raiseResolvedReferenceList from './raiseResolvedReferenceList.js';

export default templateCompositeFrom({
  annotation: `withResolvedReferenceList`,

  inputs: {
    list: input({
      validate: validateArrayItems(isString),
      acceptsNull: true,
    }),

    data: inputWikiData({allowMixedTypes: true}),
    find: input({type: 'function'}),

    notFoundMode: inputNotFoundMode(),
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
      dependencies: [input('data'), input('find')],
      compute: (continuation, {
        [input('data')]: data,
        [input('find')]: findFunction,
      }) => continuation({
        ['#map']:
          ref => findFunction(ref, data, {mode: 'quiet'}),
      }),
    },

    withMappedList({
      list: input('list'),
      map: '#map',
    }).outputs({
      '#mappedList': '#matches',
    }),

    withAvailabilityFilter({
      from: '#matches',
    }),

    raiseResolvedReferenceList({
      notFoundMode: input('notFoundMode'),
      results: '#matches',
      filter: '#availabilityFilter',
      outputs: input.value('#resolvedReferenceList'),
    }),
  ],
});
