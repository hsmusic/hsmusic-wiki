// Resolves a list of references, with each reference matched with provided
// data in the same way as withResolvedReference. By default it will filter
// out references which don't match, but this can be changed to early exit
// ({notFoundMode: 'exit'}) or leave null in place ('null').

import {input, templateCompositeFrom} from '#composite';
import {isString, validateArrayItems} from '#validators';

import {withMappedList} from '#composite/data';

import {
  exitWithoutDependency,
  raiseOutputWithoutDependency,
  withAvailabilityFilter,
} from '#composite/control-flow';

import gobbleSoupyFind from './gobbleSoupyFind.js';
import inputNotFoundMode from './inputNotFoundMode.js';
import inputSoupyFind from './inputSoupyFind.js';
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
    find: inputSoupyFind(),

    notFoundMode: inputNotFoundMode(),
  },

  outputs: ['#resolvedReferenceList'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: input('list'),
      mode: input.value('empty'),
      output: input.value({
        ['#resolvedReferenceList']: [],
      }),
    }),

    gobbleSoupyFind({
      find: input('find'),
    }),

    {
      dependencies: [input('data'), '#find'],
      compute: (continuation, {
        [input('data')]: data,
        ['#find']: findFunction,
      }) => continuation({
        ['#map']:
          (data
            ? ref => findFunction(ref, data, {mode: 'quiet'})
            : ref => findFunction(ref, {mode: 'quiet'})),
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
